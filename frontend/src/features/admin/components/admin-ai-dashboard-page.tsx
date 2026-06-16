"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Bot, Database, LineChart, MessageSquare, Settings2, Sparkles } from "lucide-react"
import { getAdminAiDashboard } from "@/features/admin/api"
import { AdminPageHeader, StatCard } from "./admin-shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"

const usageConfig = {
    messages: { label: "Сообщения", color: "var(--primary)" },
    sessions: { label: "Сессии", color: "var(--chart-2)" },
} satisfies ChartConfig

const modelConfig = {
    count: { label: "Ответы", color: "var(--primary)" },
} satisfies ChartConfig

export function AdminAiDashboardPage() {
    const query = useQuery({ queryKey: ["admin", "ai", "dashboard"], queryFn: getAdminAiDashboard })
    const data = query.data

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="AI центр"
                description="Модели, промпты, RAG-индекс и метрики использования AI в платформе. Раздел доступен только администратору."
                actions={(
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline"><Link href="/admin/ai/models"><Settings2 className="mr-2 size-4" />Модели и промпты</Link></Button>
                        <Button asChild><Link href="/admin/ai/index"><Database className="mr-2 size-4" />RAG индекс</Link></Button>
                    </div>
                )}
            />

            {query.isLoading ? <Skeleton className="h-40" /> : data ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="AI сообщения" value={data.stats.messages} hint={`${data.stats.sessions} сессий`} />
                        <StatCard label="Активные модели" value={data.stats.models_enabled} hint={`${data.stats.chat_models} chat · ${data.stats.embedding_models} embedding`} />
                        <StatCard label="RAG документы" value={data.stats.documents} hint={`${data.stats.chunks} chunks`} />
                        <StatCard label="Провайдер" value={data.defaults.provider} hint={data.defaults.configured ? "ключ настроен" : "ключ не найден"} />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><LineChart className="size-5 text-primary" />Использование за 14 дней</CardTitle>
                                <CardDescription>Динамика AI-сессий и сообщений в пользовательском чате.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={usageConfig} className="h-[280px] w-full">
                                    <AreaChart data={data.daily} margin={{ left: 8, right: 8 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tickLine={false} axisLine={false} width={32} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area dataKey="messages" type="monotone" fill="var(--color-messages)" fillOpacity={0.22} stroke="var(--color-messages)" />
                                        <Area dataKey="sessions" type="monotone" fill="var(--color-sessions)" fillOpacity={0.12} stroke="var(--color-sessions)" />
                                    </AreaChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Bot className="size-5 text-primary" />Текущие defaults</CardTitle>
                                <CardDescription>Эти значения используются пользователями, если они не выбрали модель вручную.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <InfoRow label="Chat" value={data.defaults.chat_model} />
                                <InfoRow label="Embeddings" value={`${data.defaults.embedding.provider} / ${data.defaults.embedding.model}`} />
                                <InfoRow label="Dimensions" value={String(data.defaults.embedding.dimensions)} />
                                <Badge variant={data.defaults.configured ? "default" : "destructive"}>{data.defaults.configured ? "OpenRouter API key найден" : "OpenRouter API key не настроен"}</Badge>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />Использование моделей</CardTitle>
                            <CardDescription>Последние assistant-сообщения, сгруппированные по модели из metadata.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.models.length ? (
                                <ChartContainer config={modelConfig} className="h-[260px] w-full">
                                    <BarChart data={data.models} margin={{ left: 8, right: 8 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="model" tickLine={false} axisLine={false} tickMargin={8} hide />
                                        <YAxis tickLine={false} axisLine={false} width={32} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex min-h-32 items-center justify-center rounded-xl border text-sm text-muted-foreground">
                                    <MessageSquare className="mr-2 size-4" />Данных по моделям пока нет.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 break-words font-medium">{value}</p>
        </div>
    )
}
