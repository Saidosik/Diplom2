import type { User } from "@/features/auth/types"

export function getUserAvatarUrl(user: Pick<User, "avatar" | "avatar_url">) {
    return user.avatar_url ?? user.avatar ?? null
}

export function getUserInitials(
    name?: string | null,
    email?: string | null
) {
    const source = name?.trim() || email?.split("@")[0] || "U"
    const parts = source.split(/\s+/).filter(Boolean)

    const initials =
        parts.length >= 2
            ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
            : source.slice(0, 2)

    return initials.toUpperCase()
}

export function getUserRoleLabel(role?: string | null) {
    const labels: Record<string, string> = {
        admin: "Администратор",
        moderator: "Модератор",
        user: "Пользователь",
    }

    return role ? labels[role] ?? role : "Пользователь"
}

export function getAuthProviderLabel(provider: string) {
    const labels: Record<string, string> = {
        google: "Google",
        yandex: "Яндекс",
        "email/password": "Email и пароль",
    }

    return labels[provider] ?? provider
}

export function getRegisteredViaLabel(value?: string | string[] | null) {
    if (!value) {
        return "Email и пароль"
    }

    if (Array.isArray(value)) {
        return value.map(getAuthProviderLabel).join(", ")
    }

    return getAuthProviderLabel(value)
}

export function formatProfileDate(value?: string | null) {
    if (!value) {
        return "Не указано"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return "Не указано"
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date)
}