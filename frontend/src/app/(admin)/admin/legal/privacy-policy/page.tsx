import { requireSystemAdmin } from "@/features/admin/server"
import { AdminPrivacyPolicyPage } from "@/features/admin/components/admin-privacy-policy-page"

export default async function AdminPrivacyPolicyRoute() {
    await requireSystemAdmin()

    return <AdminPrivacyPolicyPage />
}
