import Link from "next/link"
import { LockKeyhole, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AuthRequiredMessageProps = {
    title?: string
    description?: string
    compact?: boolean
    className?: string
}

export function AuthRequiredMessage({
    title = "Нужно авторизоваться",
    description = "Войдите в аккаунт, чтобы писать комментарии, отвечать, сохранять материалы и ставить реакции.",
    compact = false,
    className,
}: AuthRequiredMessageProps) {
    return (
        <Card className={cn(
            "overflow-hidden border-dashed bg-gradient-to-br from-primary/10 via-card to-card shadow-sm",
            className,
        )}>
            <CardContent className={cn("flex flex-col gap-4 p-5", !compact && "md:flex-row md:items-center md:justify-between")}> 
                <div className="flex gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                        <LockKeyhole className="size-5" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold tracking-tight">{title}</h3>
                            <span className="inline-flex items-center gap-1 rounded-full border bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                                <Sparkles className="size-3" />
                                бесплатный вход
                            </span>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild>
                        <Link href="/auth?mode=login">Войти</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/auth?mode=register">Создать аккаунт</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
