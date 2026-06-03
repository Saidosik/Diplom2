import { browserApi } from "@/lib/http/browser"
import type {
    CommunityNotification,
    NotificationCollectionResponse,
    NotificationSettings,
    NotificationSettingsResponse,
    ReputationEventsResponse,
    CommunityDiscovery,
    CommunityTopUser,
    CommunityTrend,
    CommunityRecommendation,
    CommunityFeedItem,
    InterestProfile,
} from "@/features/community/types"

export async function getCommunityDiscovery(period: "day" | "week" | "month" = "week") {
    const response = await browserApi.get<CommunityDiscovery>("/laravel/community/discovery", { params: { period } })
    return response.data
}

export async function getCommunityFeed(period: "day" | "week" | "month" = "week") {
    const response = await browserApi.get<{ period: string; data: CommunityFeedItem[] }>("/laravel/community/feed", { params: { period } })
    return response.data
}

export async function getCommunityTrends(period: "day" | "week" | "month" = "week") {
    const response = await browserApi.get<{ period: string; data: CommunityTrend[] }>("/laravel/community/trends", { params: { period } })
    return response.data
}

export async function getCommunityRecommendations(period: "day" | "week" | "month" = "week") {
    const response = await browserApi.get<{ period: string; data: CommunityRecommendation[] }>("/laravel/community/recommendations", { params: { period } })
    return response.data
}


export async function getMyInterests() {
    const response = await browserApi.get<{ data: InterestProfile }>("/laravel/me/interests")
    return response.data.data
}

export async function updateMyInterests(tagIds: number[]) {
    const response = await browserApi.patch<{ data: InterestProfile }>("/laravel/me/interests", { tag_ids: tagIds })
    return response.data.data
}

export async function getCommunityUsers(params?: { q?: string; limit?: number }) {
    const response = await browserApi.get<{ data: CommunityTopUser[]; meta?: Record<string, unknown> }>("/laravel/community/users", { params })
    return response.data
}

export async function getNotifications(params?: Record<string, string | number | undefined>) {
    const response = await browserApi.get<NotificationCollectionResponse>("/laravel/inbox", { params })
    return response.data
}

export async function getUnreadNotificationsCount() {
    const response = await browserApi.get<{ unread_count: number }>("/laravel/inbox/unread-count")
    return response.data.unread_count
}

export async function markNotificationAsRead(id: number) {
    const response = await browserApi.post<{ data: CommunityNotification }>(`/laravel/inbox/${id}/read`)
    return response.data.data
}

export async function markAllNotificationsAsRead() {
    const response = await browserApi.post<{ message: string; unread_count: number }>("/laravel/inbox/read-all")
    return response.data
}

export async function getNotificationSettings() {
    const response = await browserApi.get<NotificationSettingsResponse>("/laravel/me/notification-settings")
    return response.data.data
}

export async function updateNotificationSettings(payload: Partial<NotificationSettings>) {
    const response = await browserApi.patch<NotificationSettingsResponse>("/laravel/me/notification-settings", payload)
    return response.data.data
}

export type SubscribableType = "user" | "publication" | "issue_question" | "issue_answer" | "comment" | "tag"

export async function getSubscriptionStatus(type: SubscribableType, id: number) {
    const response = await browserApi.get<{ is_subscribed: boolean }>("/laravel/subscriptions/status", {
        params: {
            subscribable_type: type,
            subscribable_id: id,
        },
    })

    return response.data.is_subscribed
}

export async function subscribeToTarget(type: SubscribableType, id: number) {
    const response = await browserApi.post<{ data: { id: number } }>("/laravel/subscriptions", {
        subscribable_type: type,
        subscribable_id: id,
    })

    return response.data.data
}

export async function unsubscribeFromTarget(type: SubscribableType, id: number) {
    const response = await browserApi.delete<{ message: string }>("/laravel/subscriptions", {
        data: {
            subscribable_type: type,
            subscribable_id: id,
        },
    })

    return response.data
}


export async function getMyReputationEvents(params?: Record<string, string | number | undefined>) {
    const response = await browserApi.get<ReputationEventsResponse>("/laravel/me/reputation-events", { params })
    return response.data
}

export async function getUserReputationEvents(userId: number | string, params?: Record<string, string | number | undefined>) {
    const response = await browserApi.get<ReputationEventsResponse>(`/laravel/users/${userId}/reputation-events`, { params })
    return response.data
}
