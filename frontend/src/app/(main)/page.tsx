import { RecommendationsBlock } from "@/features/home/components/recommendations-block"
import { PopularPublicationsFeed } from "@/features/home/components/popular-publications-feed"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function HomePage() {
    return (
        <>
            <RecommendationsBlock />
            <PopularPublicationsFeed />
        </>
    )
}
