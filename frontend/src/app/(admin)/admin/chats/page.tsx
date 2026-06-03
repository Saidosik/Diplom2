import { requireStaff } from "@/features/admin/server"
import { AdminChatsPage } from "@/features/admin/components/admin-chats-page"

export default async function AdminChatsRoute() {
    await requireStaff()

    return <AdminChatsPage />
}
