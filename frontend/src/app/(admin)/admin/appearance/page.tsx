import { requireSystemAdmin } from "@/features/admin/server"
import { AdminAppearancePage } from "@/features/admin/components/admin-appearance-page"

export default async function AdminAppearanceRoutePage() {
    await requireSystemAdmin()

    return <AdminAppearancePage />
}
