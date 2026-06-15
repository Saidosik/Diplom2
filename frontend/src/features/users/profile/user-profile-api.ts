import { browserApi } from "@/lib/http/browser"
import { normalizeSectionItems, normalizeUserProfileDashboard } from "./user-profile-normalizers"
import type { UserProfileDashboard, UserProfileHubItem, UserProfileTab } from "./user-profile-types"

export async function getUserProfileDashboard(user: number | string): Promise<UserProfileDashboard> {
  const response = await browserApi.get<unknown>(`/laravel/users/${user}/profile/dashboard`)
  return normalizeUserProfileDashboard(response.data)
}

export async function getUserProfileSection(user: number | string, tab: UserProfileTab): Promise<UserProfileHubItem[]> {
  const endpoint = tab === "publications" || tab === "questions" || tab === "answers"
    ? `/laravel/users/${user}/materials`
    : `/laravel/users/${user}/${tab}`
  const params = tab === "publications" ? { type: "publications" } : tab === "questions" ? { type: "questions" } : tab === "answers" ? { type: "answers" } : undefined
  const response = await browserApi.get<unknown>(endpoint, { params })
  return normalizeSectionItems(response.data)
}

export async function openProfileMessage(userId: number) {
  const response = await browserApi.post<{ data: { id: number; url: string } }>(`/laravel/users/${userId}/message`)
  return response.data.data
}

export async function unpinProfileItem(payload: { pinnable_type: string; pinnable_id: number }) {
  const response = await browserApi.delete<{ message: string }>("/laravel/me/profile/pins", { data: payload })
  return response.data
}
