import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RagSource } from "@/features/ai-rag/types"

const labels: Record<string, string> = {
    publication: "Публикация",
    question: "Вопрос",
    answer: "Ответ",
    snippet: "Сниппет",
}

export function RagSourceCard({ source }: { source: RagSource }) {
    return (
        <Card className="bg-muted/20">
            <CardHeader className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{labels[source.type] ?? source.type}</Badge>
                    <Badge variant="outline">score {Math.round(source.score * 100)}</Badge>
                    <Badge variant="outline">semantic {Math.round(source.semantic_score * 100)}</Badge>
                </div>
                <CardTitle className="text-base leading-snug">
                    {source.href ? (
                        <Link href={source.href} className="hover:text-primary">
                            {source.title}
                        </Link>
                    ) : (
                        source.title
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
                <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{source.content}</p>
                {source.tags?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                        {source.tags.slice(0, 6).map((tag) => (
                            <Badge key={`${source.id}-${tag.name}`} variant="outline">
                                #{tag.name}
                            </Badge>
                        ))}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}
