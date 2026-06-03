import { AdminShell } from "@/features/admin/components/admin-shell"
import { requireStaff } from "@/features/admin/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await requireStaff()

    return <AdminShell user={user}>{children}</AdminShell>
}
