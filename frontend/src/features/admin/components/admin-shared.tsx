"use client"

import type * as React from "react"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils/date"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export const reportStatuses = [
    { value: "new", label: "Новые" },
    { value: "reviewed", label: "Рассмотренные" },
    { value: "rejected", label: "Отклонённые" },
    { value: "all", label: "Все" },
]

export function AdminPageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                <p className="text-sm font-medium text-primary">Администрирование</p>
                <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    )
}

export function AdminNav() {
    const items = [
        ["Обзор", "/admin"],
        ["Жалобы", "/admin/reports"],
        ["Пользователи", "/admin/users"],
        ["Контент", "/admin/content"],
        ["Чаты", "/admin/chats"],
        ["AI индекс", "/admin/ai"],
        ["Внешний вид", "/admin/appearance"],
    ] as const

    return (
        <div className="flex flex-wrap gap-2">
            {items.map(([label, href]) => (
                <Button key={href} asChild variant="outline" size="sm">
                    <Link href={href}>{label}</Link>
                </Button>
            ))}
        </div>
    )
}

export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
    return (
        <Card className="min-w-0">
            <CardHeader className="min-w-0 pb-2">
                <CardDescription className="truncate">{label}</CardDescription>
                <CardTitle className="break-words text-2xl sm:text-3xl">{value}</CardTitle>
            </CardHeader>
            {hint ? <CardContent className="min-w-0 break-words pt-0 text-sm text-muted-foreground">{hint}</CardContent> : null}
        </Card>
    )
}

export function AdminFilters({
    query,
    onQueryChange,
    status,
    onStatusChange,
    statusOptions = reportStatuses,
    extra,
}: {
    query: string
    onQueryChange: (value: string) => void
    status?: string
    onStatusChange?: (value: string) => void
    statusOptions?: Array<{ value: string; label: string }>
    extra?: React.ReactNode
}) {
    return (
        <Card>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
                <Input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Поиск"
                    className="min-w-0 lg:max-w-sm"
                />
                {onStatusChange ? (
                    <select
                        value={status}
                        onChange={(event) => onStatusChange(event.target.value)}
                        className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                ) : null}
                {extra}
            </CardContent>
        </Card>
    )
}

export function StatusBadge({ status }: { status?: string | null }) {
    const tone: "default" | "secondary" | "destructive" = status === "new" || status === "hidden" || status === "deleted"
        ? "destructive"
        : status === "published" || status === "reviewed" || status === "active"
            ? "default"
            : "secondary"

    return <Badge variant={tone}>{status ?? "—"}</Badge>
}

export function AdminTable({ children }: { children: React.ReactNode }) {
    return (
        <Card className="min-w-0">
            <CardContent className="min-w-0 p-0">
                <div className="w-full overflow-x-auto">
                    <Table className="min-w-max">{children}</Table>
                </div>
            </CardContent>
        </Card>
    )
}

export { TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime, cn }
