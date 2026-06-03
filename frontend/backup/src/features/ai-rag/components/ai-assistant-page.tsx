"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Bot, Loader2, Search, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RagSourceCard } from "@/features/ai-rag/components/rag-source-card"
import { getAiChatMessages, getAiChatSessions, sendAiChatMessage } from "@/features/ai-rag/api"
import type { AiChatMessage, AiChatSession, RagSourceType } from "@/features/ai-rag/types"

const examples = [
    "Как сделать рекомендации по тегам и сохранённым материалам?",
    "Найди материалы про Redis queues в Laravel",
    "Как работает поиск на PostgreSQL pg_trgm?",
    "Почему код в песочнице может зависнуть?",
]

export function AiAssistantPage() {
    const searchParams = useSearchParams()
    const [message, setMessage] = React.useState(() => searchParams.get("q") ?? "")
    const [type, setType] = React.useState<"all" | RagSourceType>("all")
    const [session, setSession] = React.useState<AiChatSession | null>(null)
    const [sessions, setSessions] = React.useState<AiChatSession[]>([])
    const [messages, setMessages] = React.useState<AiChatMessage[]>([])
    const [isLoading, setIsLoading] = React.useState(false)

    React.useEffect(() => {
        getAiChatSessions().then(setSessions).catch(() => null)
    }, [])

    async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
        event?.preventDefault()
        const value = message.trim()
        if (value.length < 2) return

        setIsLoading(true)
        const pendingId = Date.now()
        setMessages((items) => [
            ...items,
            { id: pendingId, role: "user", content: value, sources: [], metadata: {} },
        ])
        setMessage("")

        try {
            const response = await sendAiChatMessage({
                message: value,
                session_id: session?.id ?? null,
                type,
            })

            setSession(response.session)
            setMessages((items) => [
                ...items.filter((item) => item.id !== pendingId),
                ...response.messages,
            ].slice(-40))
            setSessions((items) => [response.session, ...items.filter((item) => item.id !== response.session.id)])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "AI-помощник недоступен")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <section className="space-y-4">
                <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%)]">
                    <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="gap-2">
                                <Bot className="size-3.5" />
                                RAG
                            </Badge>
                            <Badge variant="outline">материалы платформы</Badge>
                            <Badge variant="outline">embeddings</Badge>
                        </div>
                        <div>
                            <CardTitle className="text-3xl tracking-tight md:text-5xl">AI-помощник по базе знаний</CardTitle>
                            <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                                Задавай вопрос естественным языком. Помощник ищет по публикациям, вопросам, ответам и сниппетам, а затем отвечает с источниками.
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardContent className="space-y-4 p-4 md:p-6">
                        <div className="space-y-4">
                            {messages.length === 0 ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {examples.map((example) => (
                                        <Button key={example} variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setMessage(example)}>
                                            <Sparkles className="size-4" />
                                            {example}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                messages.map((item, index) => (
                                    <div key={`${item.id}-${index}`} className={item.role === "user" ? "ml-auto max-w-3xl" : "mr-auto max-w-4xl"}>
                                        <div className={item.role === "user" ? "rounded-2xl bg-primary px-4 py-3 text-primary-foreground" : "rounded-2xl border bg-muted/30 px-4 py-3"}>
                                            <div className="whitespace-pre-wrap text-sm leading-6">{item.content}</div>
                                        </div>
                                        {item.role === "assistant" && item.sources?.length ? (
                                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                {item.sources.slice(0, 4).map((source) => (
                                                    <RagSourceCard key={source.id} source={source} />
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-background p-3">
                            <div className="flex flex-wrap gap-2">
                                <Select value={type} onValueChange={(value) => setType(value as "all" | RagSourceType)}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все материалы</SelectItem>
                                        <SelectItem value="publication">Публикации</SelectItem>
                                        <SelectItem value="question">Вопросы</SelectItem>
                                        <SelectItem value="answer">Ответы</SelectItem>
                                        <SelectItem value="snippet">Сниппеты</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button asChild variant="ghost" className="gap-2">
                                    <Link href="/search">
                                        <Search className="size-4" />
                                        Обычный поиск
                                    </Link>
                                </Button>
                            </div>
                            <Textarea
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Например: как связать сниппет с вопросом и показать результат запуска?"
                                className="min-h-28 resize-none"
                                disabled={isLoading}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isLoading || message.trim().length < 2}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                                    Спросить
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </section>

            <aside className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Сессии</CardTitle>
                        <CardDescription>Последние диалоги с помощником.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {sessions.length ? sessions.slice(0, 12).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setSession(item)
                                    getAiChatMessages(item.id)
                                        .then((payload) => setMessages(payload.data))
                                        .catch(() => toast.error("Не удалось загрузить сообщения"))
                                }}
                                className="w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                            >
                                <div className="line-clamp-1 font-medium">{item.title}</div>
                                <div className="text-xs text-muted-foreground">{item.messages_count} сообщений</div>
                            </button>
                        )) : (
                            <p className="text-sm text-muted-foreground">Диалоги появятся после первого вопроса.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Как это работает</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                        <p>Материалы платформы разбиваются на chunks, индексируются через PostgreSQL trigram search и локальные embeddings.</p>
                        <p>Ответ строится только по найденным источникам. Если подключить внешний AI-провайдер через env, он получит этот же контекст.</p>
                    </CardContent>
                </Card>
            </aside>
        </div>
    )
}
