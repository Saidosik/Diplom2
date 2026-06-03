"use client"

import * as React from "react"
import { Flag, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createReport } from "@/features/interactions/api"
import type { ReportReason, ReportTargetType } from "@/features/interactions/types"

type ReportDialogProps = {
    targetType: ReportTargetType
    targetId: number
    label?: string
    variant?: "button" | "icon"
    isAuthenticated?: boolean
}

const reasonLabels: Record<ReportReason, string> = {
    spam: "Спам или реклама",
    offensive: "Оскорбления или токсичность",
    misinformation: "Недостоверная информация",
    abuse: "Нарушение правил платформы",
    other: "Другая причина",
}

export function ReportDialog({ targetType, targetId, label = "Пожаловаться", variant = "button", isAuthenticated = false }: ReportDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [reason, setReason] = React.useState<ReportReason>("spam")
    const [details, setDetails] = React.useState("")
    const [pending, setPending] = React.useState(false)

    async function submit() {
        if (!isAuthenticated) {
            toast.message("Нужно авторизоваться", {
                description: "Войдите в аккаунт, чтобы отправить жалобу модератору.",
            })
            return
        }

        setPending(true)

        try {
            await createReport({
                reportable_type: targetType,
                reportable_id: targetId,
                reason,
                details: details.trim() || null,
            })
            toast.success("Жалоба отправлена на модерацию")
            setOpen(false)
            setDetails("")
            setReason("spam")
        } catch (error) {
            console.log("[REPORT_ERROR]", error)
            toast.error("Для отправки жалобы нужно войти в аккаунт")
        } finally {
            setPending(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (nextOpen && !isAuthenticated) {
                    toast.message("Нужно авторизоваться", {
                        description: "Войдите в аккаунт, чтобы отправить жалобу модератору.",
                    })
                    return
                }
                setOpen(nextOpen)
            }}
        >
            <DialogTrigger asChild>
                {variant === "icon" ? (
                    <Button type="button" variant="ghost" size="icon-sm" title={label}>
                        <Flag className="size-4" />
                    </Button>
                ) : (
                    <Button type="button" variant="outline" size="sm">
                        <Flag className="size-4" />
                        {label}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Жалоба на материал</DialogTitle>
                    <DialogDescription>
                        Опиши проблему. Жалоба попадёт в модерацию и не будет видна другим пользователям.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Причина</Label>
                        <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(reasonLabels).map(([value, reasonLabel]) => (
                                    <SelectItem key={value} value={value}>{reasonLabel}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Комментарий модератору</Label>
                        <Textarea
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                            placeholder="Можно кратко объяснить, что именно не так"
                            className="min-h-28"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                        Отмена
                    </Button>
                    <Button type="button" onClick={submit} disabled={pending}>
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        Отправить жалобу
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
