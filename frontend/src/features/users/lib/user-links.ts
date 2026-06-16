export type UserProfileHrefTarget =
    | { id?: number | string | null; username?: string | null }
    | number
    | string
    | null
    | undefined

export function getUserProfileHref(target: UserProfileHrefTarget): string | null {
    if (target === null || target === undefined) return null

    if (typeof target === "number" || typeof target === "string") {
        const value = String(target).trim()
        return value ? `/user/${encodeURIComponent(value)}` : null
    }

    const username = target.username?.trim()
    if (username) return `/user/${encodeURIComponent(username)}`

    const id = target.id === null || target.id === undefined ? "" : String(target.id).trim()
    return id ? `/user/${encodeURIComponent(id)}` : null
}

export function getUserProfileHrefOrFallback(target: UserProfileHrefTarget, fallback = "/users"): string {
    return getUserProfileHref(target) ?? fallback
}
