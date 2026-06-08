import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { isAxiosError } from "axios"

import createLaravelApi from "@/lib/http/laravel"
import type { PopularPublicationPeriod, PopularPublicationsResponse } from "@/features/publications/types"

const periods: PopularPublicationPeriod[] = ["day", "week", "month", "all"]
const DEFAULT_PERIOD: PopularPublicationPeriod = "week"
const DEFAULT_LIMIT = 6
const MAX_LIMIT = 24
const REVALIDATE_SECONDS = 120

const getCachedPopularPublications = unstable_cache(
    async (period: PopularPublicationPeriod, limit: number, page: number) => {
        const api = createLaravelApi()
        const response = await api.get<PopularPublicationsResponse>("/community/popular-publications", {
            params: { period, limit, page },
        })

        return response.data
    },
    ["popular-publications"],
    { revalidate: REVALIDATE_SECONDS }
)

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const requestedPeriod = searchParams.get("period") as PopularPublicationPeriod | null
    const period = requestedPeriod && periods.includes(requestedPeriod) ? requestedPeriod : DEFAULT_PERIOD
    const limit = normalizePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT)
    const page = normalizePositiveInt(searchParams.get("page"), 1, Number.MAX_SAFE_INTEGER)

    try {
        const payload = await getCachedPopularPublications(period, limit, page)

        return NextResponse.json(payload, {
            headers: {
                "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
            },
        })
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
