"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getAdminLogs } from "@/features/admin/api"
import { AdminFilters, AdminPageHeader, StatusBadge, formatDateTime } from "./admin-shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const levelOptions = [
    { value: "all", label: "Все уровни" },
    { value: "debug", label: "Debug" },
    { value: "info", label: "Info" },
    { value: "warning", label: "Warning" },
    { value: "error", label: "Error" },
    { value: "critical", label: "Critical" },
    { value: "alert", label: "Alert" },
    { value: "emergency", label: "Emergency" },
]

export function AdminLogsPage() {
    const [q, setQ] = React.useState("")
    const [level, setLevel] = React.useState("all")
    const [lines, setLines] = React.useState(300)

    const logsQuery = useQuery({
        queryKey: ["admin", "logs", q, level, lines],
        queryFn: () => getAdminLogs({ q: q || undefined, level, lines }),
    })

    const logs = logsQuery.data?.data ?? []

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Системные логи"
                description="Просмотр последних записей Laravel log. Раздел доступен только администратору, модератор его не видит."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Файл логов</CardTitle>
                    <CardDescription>
                        {logsQuery.data?.meta.path ?? "storage/logs/laravel.log"}
                        {logsQuery.data?.meta.updated_at ? ` · обновлён ${formatDateTime(logsQuery.data.meta.updated_at)}` : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    Показано записей: {logsQuery.data?.meta.returned ?? logs.length}. Размер файла: {formatBytes(logsQuery.data?.meta.size ?? 0)}.
                </CardContent>
            </Card>

            <AdminFilters
                query={q}
                onQueryChange={setQ}
                status={level}
                onStatusChange={setLevel}
                statusOptions={levelOptions}
                extra={(
                    <select value={lines} onChange={(event) => setLines(Number(event.target.value))} className="h-10 rounded-md border bg-background px-3 text-sm">
                        <option value={100}>100 строк</option>
                        <option value={300}>300 строк</option>
                        <option value={500}>500 строк</option>
                        <option value={1000}>1000 строк</option>
                    </select>
                )}
            />

            {logsQuery.isLoading ? (
                <Skeleton className="h-96" />
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="max-h-[680px] overflow-auto rounded-xl bg-muted/30">
                            {logs.length > 0 ? logs.map((entry) => (
                                <div key={`${entry.line}-${entry.raw}`} className="border-b px-4 py-3 font-mono text-xs last:border-b-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <StatusBadge status={entry.level} />
                                        <span className="text-muted-foreground">#{entry.line}</span>
                                        {entry.datetime ? <span className="text-muted-foreground">{entry.datetime}</span> : null}
                                    </div>
                                    <pre className="whitespace-pre-wrap break-words leading-6">{entry.message}</pre>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-sm text-muted-foreground">Логи не найдены.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function formatBytes(bytes: number) {
    if (!bytes) return "0 Б"
    const units = ["Б", "КБ", "МБ", "ГБ"]
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
