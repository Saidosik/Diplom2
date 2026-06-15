export type UserProfileUser = {
  id: number
  name: string
  username?: string | null
  role?: string | null
  avatar?: string | null
  avatar_url?: string | null
  cover_url?: string | null
  headline?: string | null
  bio?: string | null
  location?: string | null
  direction?: string | null
  website_url?: string | null
  github_url?: string | null
  telegram_url?: string | null
  presence_status?: string | null
  is_online?: boolean
  created_at?: string | null
}

export type UserProfileStats = {
  reputation?: number
  publications_count?: number
  questions_count?: number
  answers_count?: number
  comments_count?: number
  followers?: number
  friends?: number
  following?: number
  snippets?: number
  files?: number
}

export type UserProfileRelationState = {
  is_owner: boolean
  is_friend?: boolean
  friendship_status?: "friends" | "incoming" | "outgoing" | string | null
  friend_request_status?: string | null
  incoming_friend_request_id?: number | null
  outgoing_friend_request_id?: number | null
  is_subscribed?: boolean
  is_following?: boolean
  can_message?: boolean
  can_report?: boolean
  mutual_friends_count?: number
}

export type UserProfileHubItem = {
  type: "publication" | "issue_question" | "issue_answer" | "code_snippet" | "user_file" | string
  id: number
  title?: string | null
  description?: string | null
  excerpt?: string | null
  url?: string | null
  created_at?: string | null
  pinned_at?: string | null
  position?: number
  visibility?: string | null
  language?: string | null
  kind?: string | null
  size?: number | null
  meta?: Record<string, unknown> | null
  tags?: Array<{ id?: number | string; name: string; slug?: string | null }>
}

export type UserProfileReputation = {
  score?: number
  level?: { label?: string; next_label?: string | null; progress?: number } | Record<string, unknown> | null
  events?: UserProfileHubItem[]
}

export type UserProfilePreviews = {
  latest_publications: UserProfileHubItem[]
  latest_questions: UserProfileHubItem[]
  latest_answers: UserProfileHubItem[]
  snippets_preview: UserProfileHubItem[]
  files_preview: UserProfileHubItem[]
  achievements_preview: UserProfileHubItem[]
  activity_preview: UserProfileHubItem[]
  reputation_summary?: UserProfileReputation
}

export type UserProfileDashboard = {
  user: UserProfileUser
  stats: UserProfileStats
  relation_state: UserProfileRelationState
  pins: UserProfileHubItem[]
  pinned_items?: UserProfileHubItem[]
  previews: UserProfilePreviews
  materials?: UserProfileHubItem[]
  snippets?: UserProfileHubItem[]
  files?: UserProfileHubItem[]
  activity?: UserProfileHubItem[]
  achievements?: UserProfileHubItem[]
  reputation?: UserProfileReputation
}

export type UserProfileTab = "overview" | "publications" | "questions" | "answers" | "snippets" | "files" | "activity" | "reputation"
