"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { getAdminDashboard } from "@/features/admin/api"
import { AdminPageHeader, AdminTable, StatCard, StatusBadge, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime } from "./admin-shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AdminDashboardPage() {
    const dashboardQuery = useQuery({ queryKey: ["admin", "dashboard"], queryFn: getAdminDashboard })

    if (dashboardQuery.isLoading) {
        return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
    }

    const data = dashboardQuery.data

    if (!data) {
        return <p className="text-sm text-muted-foreground">Не удалось загрузить данные админ-панели.</p>
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Панель управления"
                description="Сводка по пользователям, жалобам, контенту, чатам и ключевым областям платформы."
               
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Новые жалобы" value={data.stats.reports.new} hint={`${data.stats.reports.total} всего`} />
                <StatCard label="Пользователи" value={data.stats.users.active} hint={`${data.stats.users.online} онлайн`} />
                <StatCard label="Публикации" value={data.stats.content.publications.published} hint={`${data.stats.content.publications.hidden} скрыто`} />
                <StatCard label="Сообщения в чатах" value={data.stats.chats.messages} hint={`${data.stats.chats.conversations} диалогов`} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Последние жалобы</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <AdminTable>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Объект</TableHead>
                                    <TableHead>Причина</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead>Автор</TableHead>
                                    <TableHead>Дата</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recent_reports.map((report) => (
                                    <TableRow key={report.id}>
                                        <TableCell>
                                            {report.target?.href ? <Link className="font-medium hover:underline" href={report.target.href}>{report.target.title}</Link> : report.target?.title ?? "Объект удалён"}
                                        </TableCell>
                                        <TableCell>{report.reason}</TableCell>
                                        <TableCell><StatusBadge status={report.status} /></TableCell>
                                        <TableCell>{report.user?.name ?? "—"}</TableCell>
                                        <TableCell>{formatDateTime(report.created_at)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </AdminTable>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Популярные теги</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.popular_tags.map((tag) => (
                            <div key={tag.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                                <span className="font-medium">#{tag.name}</span>
                                <span className="text-muted-foreground">{tag.usage_count}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
