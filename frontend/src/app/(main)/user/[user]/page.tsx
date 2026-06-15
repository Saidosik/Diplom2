import { getCurrentUser } from "@/features/auth/server"
import { UserProfilePage } from "@/features/users/profile/user-profile-page"

type PageProps = {
  params: Promise<{ user: string }>
}

export default async function PublicUserProfilePage({ params }: PageProps) {
  const [{ user }, currentUser] = await Promise.all([params, getCurrentUser()])
  return <UserProfilePage user={user} currentUserId={currentUser?.id ?? null} />
}
