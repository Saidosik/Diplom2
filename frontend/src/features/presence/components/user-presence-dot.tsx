import { cn } from "@/lib/utils"
import type { User } from "@/features/auth/types"

function lastSeenLabel(value?: string | null) {
    if (!value) return "не был в сети"

    const diff = Date.now() - new Date(value).getTime()
    const minutes = Math.max(0, Math.round(diff / 60000))

    if (minutes < 2) return "только что"
    if (minutes < 60) return `${minutes} мин назад`

    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} ч назад`

    return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
}

export function UserPresenceDot({ user, showLabel = false, className }: { user?: User | null; showLabel?: boolean; className?: string }) {
    const online = Boolean(user?.is_online)

    return (
        <span className={cn("inline-flex items-center gap-1.5 text-xs", className)} title={online ? "В сети" : `Был в сети: ${lastSeenLabel(user?.last_seen_at)}`}>
            <span className={cn("size-2.5 rounded-full", online ? "bg-emerald-500" : "bg-muted-foreground/35")} />
            {showLabel ? <span className={online ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>{online ? "в сети" : lastSeenLabel(user?.last_seen_at)}</span> : null}
        </span>
    )
}
