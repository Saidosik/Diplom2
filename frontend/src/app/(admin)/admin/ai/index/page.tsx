import { AdminAiIndexPage } from "@/features/admin/components/admin-ai-index-page"
import { requireSystemAdmin } from "@/features/admin/server"

export default async function AdminAiIndexRoutePage() {
    await requireSystemAdmin()

    return <AdminAiIndexPage canManageSystem />
}
