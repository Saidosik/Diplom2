import type { UserProfileDashboard, UserProfileHubItem, UserProfilePreviews, UserProfileRelationState } from "./user-profile-types"

const emptyPreviews: UserProfilePreviews = {
  latest_publications: [],
  latest_questions: [],
  latest_answers: [],
  snippets_preview: [],
  files_preview: [],
  achievements_preview: [],
  activity_preview: [],
}

const guestRelation: UserProfileRelationState = {
  is_owner: false,
  is_friend: false,
  friendship_status: null,
  incoming_friend_request_id: null,
  outgoing_friend_request_id: null,
  is_subscribed: false,
  can_message: false,
  can_report: true,
}

function arrayOfItems(value: unknown): UserProfileHubItem[] {
  return Array.isArray(value) ? value.filter(Boolean) as UserProfileHubItem[] : []
}

export function normalizeUserProfileDashboard(payload: unknown): UserProfileDashboard {
  const source = (payload && typeof payload === "object" && "data" in payload ? (payload as { data: unknown }).data : payload) as Partial<UserProfileDashboard> | null
  const previews = source?.previews ?? emptyPreviews

  return {
    user: { id: 0, name: "Участник", ...(source?.user ?? {}) },
    stats: source?.stats ?? {},
    relation_state: source?.relation_state ?? (source as { relationship_to_viewer?: UserProfileRelationState } | null)?.relationship_to_viewer ?? guestRelation,
    pins: arrayOfItems(source?.pins ?? source?.pinned_items),
    pinned_items: arrayOfItems(source?.pinned_items ?? source?.pins),
    previews: {
      ...emptyPreviews,
      ...previews,
      latest_publications: arrayOfItems(previews.latest_publications),
      latest_questions: arrayOfItems(previews.latest_questions),
      latest_answers: arrayOfItems(previews.latest_answers),
      snippets_preview: arrayOfItems(previews.snippets_preview),
      files_preview: arrayOfItems(previews.files_preview),
      achievements_preview: arrayOfItems(previews.achievements_preview),
      activity_preview: arrayOfItems(previews.activity_preview),
    },
    materials: arrayOfItems(source?.materials),
    snippets: arrayOfItems(source?.snippets),
    files: arrayOfItems(source?.files),
    activity: arrayOfItems(source?.activity),
    achievements: arrayOfItems(source?.achievements),
    reputation: source?.reputation,
  }
}

export function normalizeSectionItems(payload: unknown): UserProfileHubItem[] {
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data
    if (data && typeof data === "object" && "events" in data) {
      return arrayOfItems((data as { events?: unknown }).events)
    }
    return arrayOfItems(data)
  }
  return arrayOfItems(payload)
}
