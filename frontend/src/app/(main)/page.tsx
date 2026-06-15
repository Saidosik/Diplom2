import { RecommendationsBlock } from "@/features/home/components/recommendations-block"
import { PopularPublicationsFeed } from "@/features/home/components/popular-publications-feed"

export default function HomePage() {
    return (
        <>
            <RecommendationsBlock />
            <PopularPublicationsFeed />
        </>
    )
}
