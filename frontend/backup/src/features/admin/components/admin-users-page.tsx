"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteAdminUser, getAdminUsers, restoreAdminUser, updateAdminUser } from "@/features/admin/api"
import { AdminFilters, AdminPageHeader, AdminTable, StatusBadge, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime } from "./admin-shared"
import { Button } from "@/components/ui/button"

export function AdminUsersPage({ canManageSystem = false }: { canManageSystem?: boolean }) {
    const queryClient = useQueryClient()
    const [q, setQ] = React.useState("")
    const [status, setStatus] = React.useState("active")
    const [role, setRole] = React.useState("all")

    const usersQuery = useQuery({
        queryKey: ["admin", "users", q, status, role],
        queryFn: () => getAdminUsers({ q: q || undefined, status, role: role === "all" ? undefined : role, per_page: 50 }),
    })

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
        void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
    }

    const roleMutation = useMutation({
        mutationFn: ({ id, role }: { id: number; role: string }) => updateAdminUser(id, { role }),
        onSuccess: () => { toast.success("Роль обновлена"); invalidate() },
        onError: () => toast.error("Не удалось обновить роль"),
    })
    const deleteMutation = useMutation({
        mutationFn: deleteAdminUser,
        onSuccess: () => { toast.success("Пользователь заблокирован"); invalidate() },
        onError: () => toast.error("Не удалось заблокировать пользователя"),
    })
    const restoreMutation = useMutation({
        mutationFn: restoreAdminUser,
        onSuccess: () => { toast.success("Пользователь восстановлен"); invalidate() },
        onError: () => toast.error("Не удалось восстановить пользователя"),
    })

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Пользователи" description="Управление ролями, блокировка и восстановление аккаунтов участников сообщества." />
            <AdminFilters
                query={q}
                onQueryChange={setQ}
                status={status}
                onStatusChange={setStatus}
                statusOptions={[{ value: "active", label: "Активные" }, { value: "deleted", label: "Заблокированные" }, { value: "all", label: "Все" }]}
                extra={
                    <select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                        <option value="all">Все роли</option>
                        <option value="user">Пользователи</option>
                        <option value="moderator">Модераторы</option>
                        <option value="admin">Администраторы</option>
                    </select>
                }
            />
            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Репутация</TableHead>
                        <TableHead>Контент</TableHead>
                        <TableHead>Регистрация</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(usersQuery.data?.data ?? []).map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                    {user.deleted_at ? <StatusBadge status="deleted" /> : null}
                                </div>
                            </TableCell>
                            <TableCell>
                                {canManageSystem ? (
                                    <select value={user.role} onChange={(event) => roleMutation.mutate({ id: user.id, role: event.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
                                        <option value="user">user</option>
                                        <option value="moderator">moderator</option>
                                        <option value="admin">admin</option>
                                    </select>
                                ) : (
                                    <StatusBadge status={user.role} />
                                )}
                            </TableCell>
                            <TableCell>{user.reputation_score ?? 0}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {user.counts?.publications ?? 0} публ. · {user.counts?.questions ?? 0} вопр. · {user.counts?.comments ?? 0} комм.
                            </TableCell>
                            <TableCell>{formatDateTime(user.created_at)}</TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-2">
                                    {user.deleted_at ? (
                                        <Button size="sm" variant="outline" onClick={() => restoreMutation.mutate(user.id)}>Восстановить</Button>
                                    ) : (
                                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(user.id)}>Блокировать</Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </AdminTable>
        </div>
    )
}
