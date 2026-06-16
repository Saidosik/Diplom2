import { requireStaff } from "@/features/admin/server"
import { RecommendationAnalyticsPanel } from "@/features/admin/recommendations/recommendation-analytics-panel"

export default async function AdminRecommendationsPage() {
    await requireStaff()

    return <RecommendationAnalyticsPanel />
}
