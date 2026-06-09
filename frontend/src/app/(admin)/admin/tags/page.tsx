import { AdminTagsPage } from "@/features/admin/components/admin-tags-page"
import { canManageSystem, requireStaff } from "@/features/admin/server"

export default async function AdminTagsRoute() {
    const user = await requireStaff()

    return <AdminTagsPage canDelete={canManageSystem(user)} />
}
