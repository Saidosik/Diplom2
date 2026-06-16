// BFF слой: универсальный proxy к Laravel API. Для обычных запросов возвращает JSON,
// для AI streaming проксирует text/event-stream без буферизации.

import { getAccessTokenCookie } from "@/lib/auth/cookies";
import createLaravelApi from "@/lib/http/laravel";
import { isAxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NO_STORE_GET_ENDPOINTS = new Set([
    "recommendations",
    "community/discovery",
    "community/feed",
    "community/recommendations",
    "community/trends",
])

const PERSONALIZED_FALLBACK_ENDPOINTS = new Set([
    "recommendations",
    "community/discovery",
    "community/recommendations",
])

const RETRY_AS_PUBLIC_STATUSES = new Set([401, 403, 500, 502, 503, 504])

const NO_STORE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Vary": "Cookie, Authorization",
}

type RouteContext = {
    params: Promise<{ path: string[] }>
}

async function readProxyBody(request: NextRequest): Promise<string | Buffer | undefined> {
    if (["GET", "HEAD"].includes(request.method)) {
        return undefined;
    }

    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("multipart/form-data")) {
        const buffer = await request.arrayBuffer();
        return Buffer.from(buffer)
    }
    return request.text()
}

async function proxyLaravelStream(request: NextRequest, endpoint: string) {
    const token = await getAccessTokenCookie()
    const baseURL = (process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL)

    if (!baseURL) {
        return NextResponse.json({ message: "Laravel API no defined" }, { status: 500, headers: NO_STORE_HEADERS })
    }

    const url = `${baseURL.replace(/\/+$/, "")}/${endpoint}`
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text()

    const response = await fetch(url, {
        method: request.method,
        body,
        headers: {
            Accept: "text/event-stream",
            "Content-Type": request.headers.get("content-type") ?? "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
    })

    if (!response.ok) {
        const text = await response.text().catch(() => "")
        return NextResponse.json(
            text ? safeJson(text) : { message: "Ошибка streaming-запроса к Laravel" },
            { status: response.status, headers: NO_STORE_HEADERS }
        )
    }

    return new Response(response.body, {
        status: response.status,
        headers: {
            "Content-Type": response.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
            "Cache-Control": "private, no-store, max-age=0, no-transform, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Vary": "Cookie, Authorization",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    })
}

function safeJson(text: string) {
    try {
        return JSON.parse(text)
    } catch {
        return { message: text || "Ошибка запроса к Laravel" }
    }
}

async function proxyLaravel(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    const pathname = path.join("/")
    const endpoint = `${pathname}${request.nextUrl.search}`

    if (pathname === "ai/chat/stream" || request.headers.get("accept")?.includes("text/event-stream")) {
        return proxyLaravelStream(request, endpoint)
    }

    const forcePublic = request.headers.get("x-vector-public-request") === "1"
    const token = forcePublic ? null : await getAccessTokenCookie()
    const Laravel = createLaravelApi(token)
    const contentType = request.headers.get("content-type") ?? undefined;
    const body = await readProxyBody(request)
    const headers = contentType ? { "Content-Type": contentType } : undefined

    try {
        const response = await Laravel.request({
            url: endpoint,
            method: request.method,
            data: body,
            headers,
        })

        return NextResponse.json(response.data, {
            status: response.status,
            headers: shouldNoStore(request, pathname) ? NO_STORE_HEADERS : undefined,
        })
    } catch (error) {
        if (isAxiosError(error)) {
            const status = error.response?.status ?? 500

            if (shouldRetryPersonalizedAsPublic(request, pathname, token, status)) {
                const fallbackResponse = await tryPublicFallback(endpoint, request.method, headers)

                if (fallbackResponse) {
                    return NextResponse.json(markFallbackPayload(fallbackResponse.data), {
                        status: fallbackResponse.status,
                        headers: NO_STORE_HEADERS,
                    })
                }
            }

            const responseHeaders = new Headers()
            const retryAfter = error.response?.headers?.["retry-after"]
            if (retryAfter) responseHeaders.set("Retry-After", String(retryAfter))
            applyNoStoreHeaders(responseHeaders, shouldNoStore(request, pathname))

            return NextResponse.json(
                error.response?.data ?? { message: "Ошибка запроса к серверу" },
                { status, headers: responseHeaders }
            )
        }

        return NextResponse.json(
            { message: "Ошибка проксирования запроса к серверу" },
            { status: 500, headers: shouldNoStore(request, pathname) ? NO_STORE_HEADERS : undefined }
        )
    }
}

function shouldNoStore(request: NextRequest, pathname: string) {
    return isAiEndpoint(pathname)
        || request.method !== "GET"
        || NO_STORE_GET_ENDPOINTS.has(pathname)
}

function isAiEndpoint(pathname: string) {
    return pathname === "ai/capabilities"
        || pathname === "ai/search"
        || pathname.startsWith("ai/chat")
        || pathname.startsWith("ai/rag")
        || pathname.startsWith("ai/code")
}

function shouldRetryPersonalizedAsPublic(request: NextRequest, pathname: string, token: string | null, status: number) {
    return Boolean(token)
        && request.method === "GET"
        && PERSONALIZED_FALLBACK_ENDPOINTS.has(pathname)
        && RETRY_AS_PUBLIC_STATUSES.has(status)
}

async function tryPublicFallback(endpoint: string, method: string, headers?: Record<string, string>) {
    try {
        return await createLaravelApi().request({
            url: endpoint,
            method,
            headers,
        })
    } catch (fallbackError) {
        console.error("Laravel public fallback failed", fallbackError)
        return null
    }
}

function markFallbackPayload(payload: unknown) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return payload
    }

    const record = payload as Record<string, unknown>
    const meta = record.meta && typeof record.meta === "object" && !Array.isArray(record.meta)
        ? record.meta as Record<string, unknown>
        : {}

    return {
        ...record,
        meta: {
            ...meta,
            fallback: true,
            fallback_reason: "personalized_request_failed_public_feed_used",
        },
    }
}

function applyNoStoreHeaders(headers: Headers, enabled: boolean) {
    if (!enabled) return

    Object.entries(NO_STORE_HEADERS).forEach(([key, value]) => {
        headers.set(key, value)
    })
}

export const GET = proxyLaravel
export const POST = proxyLaravel
export const PATCH = proxyLaravel
export const PUT = proxyLaravel
export const DELETE = proxyLaravel
