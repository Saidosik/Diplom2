import { AdminUsersPage } from "@/features/admin/components/admin-users-page"
import { canManageSystem, requireStaff } from "@/features/admin/server"

export default async function AdminUsersRoute() {
    const user = await requireStaff()

    return <AdminUsersPage canManageSystem={canManageSystem(user)} />
}
