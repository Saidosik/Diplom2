import { requireStaff } from "@/features/admin/server"
import { AdminDashboardPage } from "@/features/admin/components/admin-dashboard-page"

export default async function AdminPage() {
    await requireStaff()

    return <AdminDashboardPage />
}
