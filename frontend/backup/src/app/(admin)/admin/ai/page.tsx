import { AdminAiIndexPage } from "@/features/admin/components/admin-ai-index-page"
import { canManageSystem, requireStaff } from "@/features/admin/server"

export default async function AdminAiPage() {
    const user = await requireStaff()

    return <AdminAiIndexPage canManageSystem={canManageSystem(user)} />
}
