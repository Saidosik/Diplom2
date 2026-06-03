"use client"

import { BellPlus, BellOff } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    getSubscriptionStatus,
    subscribeToTarget,
    unsubscribeFromTarget,
    type SubscribableType,
} from "@/features/community/api"

type SubscribeButtonProps = {
    type: SubscribableType
    id?: number | null
    label?: string
    activeLabel?: string
    disabled?: boolean
}

export function SubscribeButton({
    type,
    id,
    label = "Подписаться",
    activeLabel = "Вы подписаны",
    disabled = false,
}: SubscribeButtonProps) {
    const queryClient = useQueryClient()
    const queryKey = ["subscription", type, id]

    const statusQuery = useQuery({
        queryKey,
        queryFn: () => getSubscriptionStatus(type, Number(id)),
        enabled: Boolean(id) && !disabled,
        retry: false,
    })

    const mutation = useMutation({
        mutationFn: async () => {
            if (!id) return false

            if (statusQuery.data) {
                await unsubscribeFromTarget(type, id)
                return false
            }

            await subscribeToTarget(type, id)
            return true
        },
        onSuccess: (isSubscribed) => {
            queryClient.setQueryData(queryKey, isSubscribed)
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
            toast.success(isSubscribed ? "Подписка добавлена" : "Подписка удалена")
        },
        onError: () => {
            toast.error("Не удалось изменить подписку")
        },
    })

    const isSubscribed = Boolean(statusQuery.data)

    return (
        <Button
            type="button"
            variant={isSubscribed ? "secondary" : "outline"}
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!id || disabled || statusQuery.isLoading || mutation.isPending}
        >
            {isSubscribed ? <BellOff className="size-4" /> : <BellPlus className="size-4" />}
            {isSubscribed ? activeLabel : label}
        </Button>
    )
}
