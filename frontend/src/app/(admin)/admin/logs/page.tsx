import { AdminLogsPage } from "@/features/admin/components/admin-logs-page"
import { requireSystemAdmin } from "@/features/admin/server"

export default async function AdminLogsRoute() {
    await requireSystemAdmin()

    return <AdminLogsPage />
}
