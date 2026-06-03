import { requireStaff } from "@/features/admin/server"
import { AdminContentPage } from "@/features/admin/components/admin-content-page"

export default async function AdminContentRoute() {
    await requireStaff()

    return <AdminContentPage />
}
