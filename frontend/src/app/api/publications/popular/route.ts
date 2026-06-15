import { NextRequest, NextResponse } from "next/server"
import { isAxiosError } from "axios"

import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { normalizePublicationsResponse } from "@/features/community/lib/response-normalizers"
import type { PopularPublicationPeriod } from "@/features/publications/types"

const periods: PopularPublicationPeriod[] = ["day", "week", "month", "all"]
const DEFAULT_PERIOD: PopularPublicationPeriod = "week"
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 24
const REVALIDATE_SECONDS = 60
const AUTH_ERROR_STATUSES = new Set([401, 403])

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const requestedPeriod = searchParams.get("period") as PopularPublicationPeriod | null
    const period = requestedPeriod && periods.includes(requestedPeriod) ? requestedPeriod : DEFAULT_PERIOD
    const limit = normalizePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT)
    const page = normalizePositiveInt(searchParams.get("page"), 1, Number.MAX_SAFE_INTEGER)
    const sort = searchParams.get("sort") || "popular"
    const type = searchParams.get("type") || "all"

    try {
        const token = await getAccessTokenCookie()
        const params = {
            period,
            limit,
            page,
            sort,
            type: type === "all" ? undefined : type,
        }

        try {
            const api = createLaravelApi(token)
            const response = await api.get<unknown>("/community/popular-publications", { params })
            const payload = normalizePublicationsResponse(response.data, period)

            return NextResponse.json(payload, {
                headers: token
                    ? { "Cache-Control": "private, no-store" }
                    : {
                        "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
                    },
            })
        } catch (error) {
            if (token && isAxiosError(error) && AUTH_ERROR_STATUSES.has(error.response?.status ?? 0)) {
                const publicApi = createLaravelApi()
                const response = await publicApi.get<unknown>("/community/popular-publications", { params })
                const payload = normalizePublicationsResponse(response.data, period)

                return NextResponse.json(payload, {
                    headers: { "Cache-Control": "private, no-store" },
                })
            }

            throw error
        }
    } catch (error) {
        if (isAxiosError(error)) {
            return NextResponse.json(
                error.response?.data ?? { message: "Ошибка загрузки популярных публикаций" },
                { status: error.response?.status ?? 500 }
            )
        }

        return NextResponse.json({ message: "Ошибка загрузки популярных публикаций" }, { status: 500 })
    }
}

function normalizePositiveInt(value: string | null, fallback: number, max: number) {
    const parsed = Number.parseInt(value ?? "", 10)

    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback
    }

    return Math.min(parsed, max)
}
