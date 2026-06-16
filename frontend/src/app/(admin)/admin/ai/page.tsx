import { requireSystemAdmin } from "@/features/admin/server"
import { AdminAiDashboardPage } from "@/features/admin/components/admin-ai-dashboard-page"

export default async function AdminAiPage() {
    await requireSystemAdmin()

    return <AdminAiDashboardPage />
}
