"use client"

import * as React from "react"
import { Bookmark, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { removeSavedItem, saveItem } from "@/features/interactions/api"
import type { SavedTargetType } from "@/features/interactions/types"

type SaveButtonProps = {
    targetType: SavedTargetType
    targetId: number
    initialSaved?: boolean
    variant?: "button" | "icon"
    className?: string
}

export function SaveButton({
    targetType,
    targetId,
    initialSaved = false,
    variant = "button",
    className,
}: SaveButtonProps) {
    const [saved, setSaved] = React.useState(Boolean(initialSaved))
    const [pending, setPending] = React.useState(false)

    async function toggleSaved() {
        setPending(true)

        try {
            if (saved) {
                await removeSavedItem({ saveable_type: targetType, saveable_id: targetId })
                setSaved(false)
                toast.success("Удалено из сохранённого")
            } else {
                await saveItem({ saveable_type: targetType, saveable_id: targetId })
                setSaved(true)
                toast.success("Добавлено в сохранённое")
            }
        } catch (error) {
            console.log("[SAVE_ITEM_ERROR]", error)
            toast.error("Чтобы сохранять материалы, нужно войти в аккаунт")
        } finally {
            setPending(false)
        }
    }

    if (variant === "icon") {
        return (
            <Button
                type="button"
                variant={saved ? "default" : "ghost"}
                size="icon-sm"
                onClick={toggleSaved}
                disabled={pending}
                title={saved ? "Убрать из сохранённого" : "Сохранить"}
                className={className}
            >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className={cn("size-4", saved && "fill-current")} />}
            </Button>
        )
    }

    return (
        <Button
            type="button"
            variant={saved ? "default" : "outline"}
            size="sm"
            onClick={toggleSaved}
            disabled={pending}
            className={className}
        >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className={cn("size-4", saved && "fill-current")} />}
            {saved ? "Сохранено" : "Сохранить"}
        </Button>
    )
}
