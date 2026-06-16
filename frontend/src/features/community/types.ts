import type { IssueQuestion } from "@/features/issues/types"
import type { Publication } from "@/features/publications/types"

export type CommunityStats = {
    publications_count: number
    questions_count: number
    solved_questions_count: number
    unanswered_questions_count: number
    comments_count: number
    members_count: number
}

export type ReputationLevel = {
    label: string
    next_label?: string | null
    progress: number
}

export type CommunityTopUser = {
    id: number
    name: string
    username?: string | null
    role?: string | null
    headline?: string | null
    bio?: string | null
    reputation_score: number
    reputation_level?: ReputationLevel | null
    stats?: {
        publications_count?: number
        questions_count?: number
        answers_count?: number
        comments_count?: number
        followers_count?: number
    }
}

export type CommunityTag = {
    id: number
    name: string
    slug: string
    description?: string | null
    color?: string | null
    usage_count: number
    period_usage_count?: number
    trend_score?: number
}


export type CommunityActivity = {
    id: number
    type: string
    title: string
    description?: string | null
    link?: string | null
    score: number
    metadata?: Record<string, unknown>
    actor?: {
        id: number
        name: string
        username?: string | null
        role?: string | null
        headline?: string | null
        reputation_score?: number
        avatar?: string | null
        avatar_url?: string | null
    } | null
    subject?: {
        type: string
        id: number
        title?: string | null
        slug?: string | null
        href?: string | null
    } | null
    target?: {
        type: string
        id: number
        title?: string | null
        slug?: string | null
        href?: string | null
    } | null
    created_at?: string | null
}

export type CommunityFeedItem = {
    type: "publication" | "question"
    label: string
    reason: string
    score: number
    created_at?: string | null
    item: Publication | IssueQuestion
}

export type CommunityRecommendation = {
    type: "publication" | "question" | "tag"
    title: string
    description?: string | null
    href: string
    reason: string
    score: number
    item?: Publication | IssueQuestion | CommunityTag
}

export type RecommendationMode = "guest" | "personalized"


export type RecommendationEventPayload = {
    event_type: "view" | "click" | "long_view" | "save" | "like" | "dislike" | "comment" | "search" | "hide" | "open_tag" | "open_author"
    target_type?: "publication" | "question" | "tag" | "user" | null
    target_id?: number | null
    context?: string | null
    metadata?: Record<string, unknown> | null
}

export type RecommendationsResponse = {
    mode: RecommendationMode
    data: CommunityRecommendation[]
    meta?: {
        period?: "day" | "week" | "month" | "all"
        personalized?: boolean
        matched_tags?: Array<{ id: number; name: string; slug: string; color?: string | null }>
        followed_authors_count?: number
        signals_count?: number
        strategy?: "guest_events" | "personalized_events" | "guest_trending" | "personalized"
    }
}

export type CommunityTrend = {
    type: "publication" | "question" | "tag"
    title: string
    href: string
    score: number
    metric_label?: string | null
    item?: Publication | IssueQuestion | CommunityTag
}

export type CommunityOverview = {
    stats: CommunityStats
    popular_publications: Publication[] | { data: Publication[] }
    actual_questions: IssueQuestion[] | { data: IssueQuestion[] }
    top_users: CommunityTopUser[]
    popular_tags: CommunityTag[]
}

export type CommunityDiscovery = CommunityOverview & {
    period: "day" | "week" | "month" | "all"
    personalized?: boolean
    feed: CommunityFeedItem[]
    recommendations: CommunityRecommendation[]
    trends: CommunityTrend[]
    unanswered_questions?: IssueQuestion[] | { data: IssueQuestion[] }
    recommendation_meta?: {
        matched_tags?: Array<{ id: number; name: string; slug: string; color?: string | null }>
        followed_authors_count?: number
        signals_count?: number
        strategy?: "guest_events" | "personalized_events" | "guest_trending" | "personalized"
    }
}


export type InterestTag = {
    id: number
    name: string
    slug: string
    description?: string | null
    color?: string | null
    usage_count: number
    is_selected: boolean
}

export type InterestProfile = {
    tags: InterestTag[]
    selected_tag_ids: number[]
    selected_count: number
}

export type CommunityNotification = {
    id: number
    type: string
    title: string
    message?: string | null
    link?: string | null
    data?: Record<string, unknown>
    is_read: boolean
    read_at?: string | null
    created_at?: string | null
    actor?: {
        id: number
        name: string
        avatar?: string | null
        avatar_url?: string | null
    } | null
}

export type NotificationSettings = {
    id: number
    inbox_enabled: boolean
    email_enabled: boolean
    notify_answers: boolean
    notify_comments: boolean
    notify_comment_replies: boolean
    notify_author_posts: boolean
    notify_subscriptions: boolean
    notify_moderation: boolean
    notify_reputation: boolean
}

export type NotificationCollectionResponse = {
    data: CommunityNotification[]
    unread_count?: number
    meta?: {
        current_page?: number
        last_page?: number
        per_page?: number
        total?: number
    }
}

export type NotificationSettingsResponse = {
    data: NotificationSettings
}

export type ReputationEvent = {
    id: number
    points: number
    reason: string
    meta?: Record<string, unknown> | null
    created_at?: string | null
    actor?: {
        id: number
        name: string
    } | null
}

export type ReputationEventsResponse = {
    data: ReputationEvent[]
    meta?: {
        current_page?: number
        last_page?: number
        per_page?: number
        total?: number
    }
}
