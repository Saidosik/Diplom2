import type { CommunityFeedItem } from "@/features/community/types"
import type { Publication, PopularPublicationPeriod, PopularPublicationsResponse } from "@/features/publications/types"

type UnknownRecord = Record<string, unknown>

export type NormalizedPaginatedResponse<T> = {
    data: T[]
    meta?: UnknownRecord
    links?: unknown
}

export function normalizePaginatedResponse<T>(payload: unknown): NormalizedPaginatedResponse<T> {
    const unwrapped = unwrapNestedData(payload)

    if (Array.isArray(unwrapped)) {
        return { data: unwrapped as T[] }
    }

    if (isRecord(unwrapped)) {
        const items = Array.isArray(unwrapped.data) ? unwrapped.data : []
        return {
            data: items as T[],
            meta: isRecord(unwrapped.meta) ? unwrapped.meta : undefined,
            links: unwrapped.links,
        }
    }

    return { data: [] }
}

export function normalizeFeedItems(payload: unknown): CommunityFeedItem[] {
    return normalizePaginatedResponse<CommunityFeedItem>(payload).data
}

export function normalizePublicationsResponse(payload: unknown, fallbackPeriod: PopularPublicationPeriod = "week"): PopularPublicationsResponse {
    const normalized = normalizePaginatedResponse<Publication>(payload)
    const meta = normalized.meta ?? {}

    return {
        data: normalized.data.map(normalizePublication),
        meta: {
            period: isPopularPeriod(meta.period) ? meta.period : fallbackPeriod,
            limit: toNumber(meta.limit, normalized.data.length),
            current_page: toNumber(meta.current_page, 1),
            next_page: toNullableNumber(meta.next_page),
            has_more: Boolean(meta.has_more ?? false),
            total: toNumber(meta.total, normalized.data.length),
        },
    }
}

export function normalizePublication(publication: Publication): Publication {
    const title = publication.title?.trim() || "Без названия"
    const slug = publication.slug?.trim() || String(publication.id)

    return {
        ...publication,
        type: publication.type ?? publication.content_type ?? "post",
        status: publication.status ?? "published",
        title,
        slug,
        excerpt: publication.excerpt ?? null,
        author: publication.author
            ? {
                ...publication.author,
                name: publication.author.name?.trim() || "Автор",
            }
            : null,
        tags: Array.isArray(publication.tags) ? publication.tags : [],
        views_count: publication.views_count ?? 0,
        likes_count: publication.likes_count ?? 0,
        dislikes_count: publication.dislikes_count ?? 0,
        comments_count: publication.comments_count ?? 0,
        saved_count: publication.saved_count ?? 0,
        reading_time_minutes: publication.reading_time_minutes ?? publication.reading_time ?? 1,
    }
}

function unwrapNestedData(payload: unknown): unknown {
    if (!isRecord(payload)) {
        return payload
    }

    if (isRecord(payload.data) && Array.isArray(payload.data.data)) {
        return {
            ...payload.data,
            meta: payload.data.meta ?? payload.meta,
            links: payload.data.links ?? payload.links,
        }
    }

    return payload
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPopularPeriod(value: unknown): value is PopularPublicationPeriod {
    return value === "day" || value === "week" || value === "month" || value === "all"
}

function toNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function toNullableNumber(value: unknown) {
    if (value === null || value === undefined) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}
