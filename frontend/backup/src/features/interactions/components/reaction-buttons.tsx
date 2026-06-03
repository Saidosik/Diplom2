"use client"

import * as React from "react"
import { ThumbsDown, ThumbsUp } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { removeReaction, setReaction } from "@/features/interactions/api"
import type { ReactionSummary, ReactionTargetType, ReactionType } from "@/features/interactions/types"
import { getEcho } from "@/lib/realtime/echo"

type ReactionButtonsProps = {
    targetType: ReactionTargetType
    targetId: number
    initialLikes?: number | null
    initialDislikes?: number | null
    initialReaction?: ReactionType | null
    compact?: boolean
    isAuthenticated?: boolean
}

export function ReactionButtons({
    targetType,
    targetId,
    initialLikes = 0,
    initialDislikes = 0,
    initialReaction = null,
    compact = false,
    isAuthenticated = false,
}: ReactionButtonsProps) {
    const [likes, setLikes] = React.useState(initialLikes ?? 0)
    const [dislikes, setDislikes] = React.useState(initialDislikes ?? 0)
    const [myReaction, setMyReaction] = React.useState<ReactionType | null>(initialReaction ?? null)
    const [pending, setPending] = React.useState<ReactionType | null>(null)

    React.useEffect(() => {
        const echo = getEcho()
        if (!echo) return

        const channelName = `content.${targetType}.${targetId}`
        const channel = echo.channel(channelName)

        channel.listen(".reaction.updated", (payload: { summary?: ReactionSummary }) => {
            if (!payload.summary) return
            setLikes(payload.summary.likes_count)
            setDislikes(payload.summary.dislikes_count)
        })

        return () => {
            echo.leave(channelName)
        }
    }, [targetType, targetId])

    async function toggleReaction(type: ReactionType) {
        if (!isAuthenticated) {
            toast.message("Нужно авторизоваться", {
                description: "Войдите в аккаунт, чтобы ставить реакции и видеть свои оценки.",
            })
            return
        }

        setPending(type)

        try {
            const result = myReaction === type
                ? await removeReaction({ reactable_type: targetType, reactable_id: targetId })
                : await setReaction({ reactable_type: targetType, reactable_id: targetId, type })

            setLikes(result.likes_count)
            setDislikes(result.dislikes_count)
            setMyReaction(result.my_reaction ?? null)
        } catch (error) {
            console.log("[REACTION_ERROR]", error)
            toast.error("Для оценки нужно войти в аккаунт")
        } finally {
            setPending(null)
        }
    }

    return (
        <div className={cn("flex items-center gap-2", compact && "gap-1")}> 
            <Button
                type="button"
                variant={myReaction === "like" ? "default" : "outline"}
                size={compact ? "sm" : "default"}
                onClick={() => toggleReaction("like")}
                disabled={pending !== null}
                className="gap-1.5"
            >
                <ThumbsUp className="size-4" />
                {likes}
            </Button>
            <Button
                type="button"
                variant={myReaction === "dislike" ? "destructive" : "outline"}
                size={compact ? "sm" : "default"}
                onClick={() => toggleReaction("dislike")}
                disabled={pending !== null}
                className="gap-1.5"
            >
                <ThumbsDown className="size-4" />
                {dislikes}
            </Button>
        </div>
    )
}
