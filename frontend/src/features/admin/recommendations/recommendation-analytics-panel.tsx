"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { getRecommendationAnalytics } from "@/features/admin/api"
import type { RecommendationAnalyticsGroup, RecommendationAnalyticsItem } from "@/features/admin/types"
import { AdminPageHeader, AdminTable, StatCard, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/admin/components/admin-shared"

const periods = [
    { value: "day", label: "День" },
    { value: "week", label: "Неделя" },
    { value: "month", label: "Месяц" },
] as const

type Period = (typeof periods)[number]["value"]

export function RecommendationAnalyticsPanel() {
    const [period, setPeriod] = useState<Period>("week")
    const analyticsQuery = useQuery({
        queryKey: ["admin", "recommendations", "analytics", period],
        queryFn: () => getRecommendationAnalytics(period),
    })
    const analytics = analyticsQuery.data
    const summary = analytics?.summary

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Аналитика рекомендаций"
                description="CTR, скрытия и позитивные сигналы по стратегиям, режимам, типам контента и позициям блока рекомендаций."
                actions={
                    <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="h-10 rounded-md border bg-background px-3 text-sm">
                        {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Показы" value={summary?.total_views ?? 0} />
                <StatCard label="Клики" value={summary?.total_clicks ?? 0} hint={`CTR ${formatPercent(summary?.ctr ?? 0)}`} />
                <StatCard label="Скрытия" value={summary?.total_hides ?? 0} hint={`Hide rate ${formatPercent(summary?.hide_rate ?? 0)}`} />
                <StatCard label="Лайки / сохранения" value={`${summary?.total_likes ?? 0} / ${summary?.total_saves ?? 0}`} hint={`Positive ${formatPercent(summary?.positive_rate ?? 0)}`} />
            </div>

            {analyticsQuery.isLoading ? <p className="text-sm text-muted-foreground">Загрузка аналитики…</p> : null}
            {analyticsQuery.isError ? <p className="text-sm text-destructive">Не удалось загрузить аналитику рекомендаций.</p> : null}

            <AnalyticsTable title="По стратегиям" label="Стратегия" rows={analytics?.by_strategy ?? []} valueKey="strategy" />
            <AnalyticsTable title="По типам" label="Тип" rows={analytics?.by_type ?? []} valueKey="type" />
            <AnalyticsTable title="По позициям" label="Позиция" rows={analytics?.by_position ?? []} valueKey="position" />

            <div className="grid gap-4 xl:grid-cols-2">
                <TopItemsTable title="Топ кликов" items={analytics?.top_clicked_items ?? []} />
                <TopItemsTable title="Топ скрытий" items={analytics?.top_hidden_items ?? []} />
            </div>
        </div>
    )
}

function AnalyticsTable({ title, label, rows, valueKey }: { title: string; label: string; rows: RecommendationAnalyticsGroup[]; valueKey: keyof RecommendationAnalyticsGroup }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>{label}</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>CTR</TableHead>
                        <TableHead>Hides</TableHead>
                        <TableHead>Hide rate</TableHead>
                        <TableHead>Likes</TableHead>
                        <TableHead>Saves</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length > 0 ? rows.map((row) => (
                        <TableRow key={`${String(valueKey)}-${String(row[valueKey] ?? "unknown")}`}>
                            <TableCell>{String(row[valueKey] ?? "unknown")}</TableCell>
                            <TableCell>{row.views}</TableCell>
                            <TableCell>{row.clicks}</TableCell>
                            <TableCell>{formatPercent(row.ctr)}</TableCell>
                            <TableCell>{row.hides}</TableCell>
                            <TableCell>{formatPercent(row.hide_rate)}</TableCell>
                            <TableCell>{row.likes}</TableCell>
                            <TableCell>{row.saves}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={8} className="text-muted-foreground">Нет данных за выбранный период.</TableCell></TableRow>
                    )}
                </TableBody>
            </AdminTable>
        </section>
    )
}

function TopItemsTable({ title, items }: { title: string; items: RecommendationAnalyticsItem[] }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Материал</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Событий</TableHead>
                        <TableHead>Стратегия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length > 0 ? items.map((item) => (
                        <TableRow key={`${item.target_type}-${item.target_id}`}>
                            <TableCell>
                                {item.href ? <Link href={item.href} className="text-primary hover:underline">{item.title || `${item.target_type} #${item.target_id}`}</Link> : (item.title || `${item.target_type} #${item.target_id}`)}
                            </TableCell>
                            <TableCell>{item.target_type}</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>{item.strategy ?? "unknown"}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={4} className="text-muted-foreground">Нет данных за выбранный период.</TableCell></TableRow>
                    )}
                </TableBody>
            </AdminTable>
        </section>
    )
}

function formatPercent(value: number) {
    return `${Math.round(value * 1000) / 10}%`
}
