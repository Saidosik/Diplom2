"use client"

import Link from "next/link"
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getAdminReports, updateAdminReport } from "@/features/admin/api"
import { AdminFilters, AdminPageHeader, AdminTable, StatusBadge, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime } from "./admin-shared"
import { Button } from "@/components/ui/button"

export function AdminReportsPage() {
    const queryClient = useQueryClient()
    const [q, setQ] = React.useState("")
    const [status, setStatus] = React.useState("new")
    const [type, setType] = React.useState("all")

    const reportsQuery = useQuery({
        queryKey: ["admin", "reports", q, status, type],
        queryFn: () => getAdminReports({ q: q || undefined, status, type: type === "all" ? undefined : type, per_page: 50 }),
    })

    const mutation = useMutation({
        mutationFn: ({ id, status, action }: { id: number; status: string; action?: string }) => updateAdminReport(id, { status, action }),
        onSuccess: () => {
            toast.success("Жалоба обновлена")
            void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
            void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
        },
        onError: () => toast.error("Не удалось обновить жалобу"),
    })

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Жалобы" description="Очередь модерации: проверка жалоб, скрытие проблемного контента и восстановление объектов после проверки." />
            <AdminFilters
                query={q}
                onQueryChange={setQ}
                status={status}
                onStatusChange={setStatus}
                extra={
                    <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                        <option value="all">Все типы</option>
                        <option value="publication">Публикации</option>
                        <option value="issue_question">Вопросы</option>
                        <option value="issue_answer">Ответы</option>
                        <option value="comment">Комментарии</option>
                    </select>
                }
            />

            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Объект</TableHead>
                        <TableHead>Жалоба</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(reportsQuery.data?.data ?? []).map((report) => (
                        <TableRow key={report.id}>
                            <TableCell className="max-w-sm">
                                <div className="space-y-1">
                                    {report.target?.href ? <Link href={report.target.href} className="font-medium hover:underline">{report.target.title}</Link> : <p className="font-medium">{report.target?.title ?? "Объект удалён"}</p>}
                                    <p className="text-xs text-muted-foreground">{report.reportable_type} #{report.reportable_id}</p>
                                </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                                <p className="font-medium">{report.reason}</p>
                                {report.details ? <p className="line-clamp-2 text-xs text-muted-foreground">{report.details}</p> : null}
                            </TableCell>
                            <TableCell>{report.user?.name ?? "—"}</TableCell>
                            <TableCell><StatusBadge status={report.status} /></TableCell>
                            <TableCell>{formatDateTime(report.created_at)}</TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: report.id, status: "reviewed", action: "hide_target" })}>Скрыть</Button>
                                    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: report.id, status: "reviewed", action: "restore_target" })}>Восст.</Button>
                                    <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: report.id, status: "rejected", action: "none" })}>Отклонить</Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </AdminTable>
        </div>
    )
}
