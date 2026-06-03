"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteAdminChatMessage, deleteAdminConversation, getAdminChatMessages, getAdminChats, restoreAdminChatMessage, restoreAdminConversation } from "@/features/admin/api"
import { AdminFilters, AdminPageHeader, AdminTable, StatusBadge, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime } from "./admin-shared"
import { Button } from "@/components/ui/button"

export function AdminChatsPage() {
    const queryClient = useQueryClient()
    const [q, setQ] = React.useState("")
    const [status, setStatus] = React.useState("active")
    const [selectedConversationId, setSelectedConversationId] = React.useState<number | null>(null)

    const chatsQuery = useQuery({
        queryKey: ["admin", "chats", q, status],
        queryFn: () => getAdminChats({ q: q || undefined, status, per_page: 40 }),
    })

    const messagesQuery = useQuery({
        queryKey: ["admin", "chat-messages", selectedConversationId],
        enabled: selectedConversationId !== null,
        queryFn: () => getAdminChatMessages(selectedConversationId!, { status: "all", per_page: 50 }),
    })

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: ["admin", "chats"] })
        void queryClient.invalidateQueries({ queryKey: ["admin", "chat-messages"] })
        void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
    }

    const deleteConversationMutation = useMutation({
        mutationFn: deleteAdminConversation,
        onSuccess: () => { toast.success("Чат удалён"); invalidate() },
        onError: () => toast.error("Не удалось удалить чат"),
    })
    const restoreConversationMutation = useMutation({
        mutationFn: restoreAdminConversation,
        onSuccess: () => { toast.success("Чат восстановлен"); invalidate() },
        onError: () => toast.error("Не удалось восстановить чат"),
    })
    const deleteMessageMutation = useMutation({
        mutationFn: ({ conversationId, messageId }: { conversationId: number; messageId: number }) => deleteAdminChatMessage(conversationId, messageId),
        onSuccess: () => { toast.success("Сообщение удалено"); invalidate() },
        onError: () => toast.error("Не удалось удалить сообщение"),
    })
    const restoreMessageMutation = useMutation({
        mutationFn: ({ conversationId, messageId }: { conversationId: number; messageId: number }) => restoreAdminChatMessage(conversationId, messageId),
        onSuccess: () => { toast.success("Сообщение восстановлено"); invalidate() },
        onError: () => toast.error("Не удалось восстановить сообщение"),
    })

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Чаты" description="Модерация личных и групповых диалогов, просмотр сообщений и управление удалением проблемного контента." />
            <AdminFilters query={q} onQueryChange={setQ} status={status} onStatusChange={setStatus} statusOptions={[{ value: "active", label: "Активные" }, { value: "deleted", label: "Удалённые" }, { value: "all", label: "Все" }]} />

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <AdminTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Диалог</TableHead>
                            <TableHead>Тип</TableHead>
                            <TableHead>Сообщения</TableHead>
                            <TableHead>Последнее</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(chatsQuery.data?.data ?? []).map((chat) => (
                            <TableRow key={chat.id} className={selectedConversationId === chat.id ? "bg-muted/50" : undefined}>
                                <TableCell>
                                    <button type="button" onClick={() => setSelectedConversationId(chat.id)} className="text-left font-medium hover:underline">
                                        {chat.title || `Диалог #${chat.id}`}
                                    </button>
                                    <p className="text-xs text-muted-foreground">{chat.participants_count} участников</p>
                                </TableCell>
                                <TableCell>{chat.type}</TableCell>
                                <TableCell>{chat.messages_count}</TableCell>
                                <TableCell>{formatDateTime(chat.last_message_at)}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedConversationId(chat.id)}>Открыть</Button>
                                        {chat.deleted_at ? (
                                            <Button size="sm" variant="outline" onClick={() => restoreConversationMutation.mutate(chat.id)}>Восст.</Button>
                                        ) : (
                                            <Button size="sm" variant="destructive" onClick={() => deleteConversationMutation.mutate(chat.id)}>Удалить</Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </AdminTable>

                <AdminTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Сообщение</TableHead>
                            <TableHead>Автор</TableHead>
                            <TableHead>Дата</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!selectedConversationId ? (
                            <TableRow><TableCell colSpan={4} className="text-muted-foreground">Выбери диалог слева.</TableCell></TableRow>
                        ) : null}
                        {(messagesQuery.data?.data ?? []).map((message) => (
                            <TableRow key={message.id}>
                                <TableCell className="max-w-sm">
                                    <p className="line-clamp-2">{message.body || (message.attachments.length ? "Вложение" : "Системное сообщение")}</p>
                                    {message.deleted_at ? <StatusBadge status="deleted" /> : null}
                                    {message.attachments.length ? <p className="text-xs text-muted-foreground">Файлов: {message.attachments.length}</p> : null}
                                </TableCell>
                                <TableCell>{message.sender?.name ?? "Система"}</TableCell>
                                <TableCell>{formatDateTime(message.created_at)}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        {message.deleted_at ? (
                                            <Button size="sm" variant="outline" onClick={() => restoreMessageMutation.mutate({ conversationId: selectedConversationId!, messageId: message.id })}>Восст.</Button>
                                        ) : (
                                            <Button size="sm" variant="destructive" onClick={() => deleteMessageMutation.mutate({ conversationId: selectedConversationId!, messageId: message.id })}>Удалить</Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </AdminTable>
            </div>
        </div>
    )
}
