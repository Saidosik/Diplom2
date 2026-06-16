import { getCurrentUser } from "@/features/auth/server"
import { UserProfilePage } from "@/features/users/profile/user-profile-page"

type PageProps = {
  params: Promise<{ user: string }>
  searchParams?: Promise<{ preview?: string }>
}

export default async function PublicUserProfilePage({ params, searchParams }: PageProps) {
  const [{ user }, currentUser, search] = await Promise.all([params, getCurrentUser(), searchParams ?? Promise.resolve({} as { preview?: string })])
  const previewAsGuest = search.preview === "guest"

  return <UserProfilePage user={user} currentUserId={currentUser?.id ?? null} previewAsGuest={previewAsGuest} />
}
