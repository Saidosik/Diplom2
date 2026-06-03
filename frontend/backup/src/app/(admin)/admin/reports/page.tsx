import { requireStaff } from "@/features/admin/server"
import { AdminReportsPage } from "@/features/admin/components/admin-reports-page"

export default async function AdminReportsRoute() {
    await requireStaff()

    return <AdminReportsPage />
}
