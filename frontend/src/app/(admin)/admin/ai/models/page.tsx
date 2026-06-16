import { requireSystemAdmin } from "@/features/admin/server"
import { AdminAiModelsPage } from "@/features/admin/components/admin-ai-models-page"

export default async function AdminAiModelsRoutePage() {
    await requireSystemAdmin()

    return <AdminAiModelsPage />
}
