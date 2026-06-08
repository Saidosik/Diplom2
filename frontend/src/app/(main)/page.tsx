import { PopularPublicationsFeed } from "@/features/home/components/popular-publications-feed"

export default function HomePage() {
    return (
        <div className="space-y-6">
            <section className="space-y-3">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Популярные публикации</h1>
                    <p className="max-w-2xl text-muted-foreground">
                        Самые обсуждаемые и полезные материалы сообщества
                    </p>
                </div>
            </section>

            <PopularPublicationsFeed />
        </div>
    )
}
