// BFF слой: универсальный proxy к Laravel API. Для обычных запросов возвращает JSON,
// для AI streaming проксирует text/event-stream без буферизации.

import { getAccessTokenCookie } from "@/lib/auth/cookies";
import createLaravelApi from "@/lib/http/laravel";
import { isAxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server"

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
        return NextResponse.json({ message: "Laravel API no defined" }, { status: 500 })
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
            { status: response.status }
        )
    }

    return new Response(response.body, {
        status: response.status,
        headers: {
            "Content-Type": response.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
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
    const endpoint = `${path.join("/")}${request.nextUrl.search}`

    if (path.join("/") === "ai/chat/stream" || request.headers.get("accept")?.includes("text/event-stream")) {
        return proxyLaravelStream(request, endpoint)
    }

    const token = request.headers.get("x-vector-public-request") === "1" ? null : await getAccessTokenCookie()
    const Laravel = createLaravelApi(token)
    const contentType = request.headers.get("content-type") ?? undefined;

    try {
        const body = await readProxyBody(request)

        const response = await Laravel.request({
            url: endpoint,
            method: request.method,
            data: body,
            headers: {
                ...(contentType ? { "Content-Type": contentType } : {}),
            }
        })

        return NextResponse.json(response.data, { status: response.status })
    } catch (error) {
        if (isAxiosError(error)) {
            const headers = new Headers()
            const retryAfter = error.response?.headers?.["retry-after"]
            if (retryAfter) headers.set("Retry-After", String(retryAfter))

            return NextResponse.json(
                error.response?.data ?? { message: "Ошибка запроса к серверу" },
                { status: error.response?.status ?? 500, headers }
            )
        }

        return NextResponse.json(
            { message: "Ошибка проксирования запроса к серверу" },
            { status: 500 }
        )
    }
}

export const GET = proxyLaravel
export const POST = proxyLaravel
export const PATCH = proxyLaravel
export const PUT = proxyLaravel
export const DELETE = proxyLaravel
