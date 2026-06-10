// export type UserRole = 'user' | 'admin' | string;
export type AuthSlug = "login" | "register"

export type SocialAccount = {
  id: number
  provider: string
  email: string | null
  name: string | null
  avatar: string | null
  created_at: string | null
}

export type User = {
  id: number
  name: string
  email: string
  role?: "user" | "admin" | "moderator" | string
  reputation_score?: number
  reputation_level?: { label: string; next_label?: string | null; progress: number } | null
  avatar?: string | null
  avatar_url?: string | null
  headline?: string | null
  bio?: string | null
  location?: string | null
  website_url?: string | null
  github_url?: string | null
  profile_visibility?: "public" | "private" | string
  is_profile_private?: boolean
  presence_status?: "online" | "offline" | string
  is_online?: boolean
  last_seen_at?: string | null
  email_verified_at?: string | null
  is_email_verified?: boolean
  email_verified?: boolean
  requires_email_verification?: boolean
  registered_via?: string | string[]
  auth_providers?: string[]
  social_accounts?: SocialAccount[]
  created_at?: string | null
  updated_at?: string | null
  meta?: {
    isAdmin?: boolean
    isModerator?: boolean
    isStaff?: boolean
    canManageSystem?: boolean
  }
}

export type LoginDto = {
  email: string
  password: string
}

export type RegisterDto = {
  name: string
  email: string
  password: string
  password_confirmation: string
  privacy_policy_accepted: boolean
}

export type UpdateProfileDto = {
  name?: string
  email?: string
  headline?: string | null
  bio?: string | null
  location?: string | null
  website_url?: string | null
  github_url?: string | null
  profile_visibility?: "public" | "private"
}

export type AuthMeResponse = {
  user: User
}

export type AuthActionResponse = {
  ok?: boolean
  message?: string
  code?: string
  requires_email_verification?: boolean
  email?: string
}

export type AllowedAuthProviders = "yandex" | "google"
export type AuthProviders = AllowedAuthProviders[]
