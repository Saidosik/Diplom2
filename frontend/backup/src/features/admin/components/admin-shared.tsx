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
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-sm font-medium text-primary">Администрирование</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
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
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
            {hint ? <CardContent className="pt-0 text-sm text-muted-foreground">{hint}</CardContent> : null}
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
            <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center">
                <Input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Поиск"
                    className="md:max-w-sm"
                />
                {onStatusChange ? (
                    <select
                        value={status}
                        onChange={(event) => onStatusChange(event.target.value)}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
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
        <Card>
            <CardContent className="p-0">
                <Table>{children}</Table>
            </CardContent>
        </Card>
    )
}

export { TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime, cn }
