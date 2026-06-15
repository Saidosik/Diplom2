import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Code2, Home, LogIn, Search, ServerCrash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { GoBackButton } from "@/components/errors/go-back-button"

type StatusPageProps = {
    status: string
    eyebrow: string
    title: string
    description: string
    details?: string
    variant?: "not-found" | "server-error" | "forbidden"
    showLoginAction?: boolean
    action?: ReactNode
}

export function StatusPage({
    status,
    eyebrow,
    title,
    description,
    details,
    variant = "not-found",
    action,
    showLoginAction = false,
}: StatusPageProps) {
    const isServerError = variant === "server-error"
    const isForbidden = variant === "forbidden"

    return (
        <section className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-muted-foreground/10 blur-3xl" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div className="space-y-7">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]">
                            {eyebrow}
                        </Badge>
                        <span className="font-mono text-sm text-muted-foreground">HTTP {status}</span>
                    </div>

                    <div className="space-y-4">
                        <h1 className="max-w-3xl text-balance font-heading text-4xl font-semibold tracking-tight md:text-6xl">
                            {title}
                        </h1>
                        <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
                            {description}
                        </p>
                        {details ? (
                            <p className="max-w-2xl rounded-2xl border bg-card/70 px-4 py-3 text-sm leading-6 text-muted-foreground shadow-sm">
                                {details}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        {action}
                        {showLoginAction ? (
                            <Button asChild>
                                <Link href="/auth?mode=login">
                                    <LogIn className="size-4" />
                                    Войти
                                </Link>
                            </Button>
                        ) : null}
                        <Button asChild>
                            <Link href="/">
                                <Home className="size-4" />
                                На главную
                            </Link>
                        </Button>
                        <GoBackButton />
                        <Button asChild variant="outline">
                            <Link href="/publications">
                                <Search className="size-4" />
                                Искать публикации
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card className="relative overflow-hidden border-border/80 bg-card/80 shadow-xl backdrop-blur">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-muted-foreground/40 to-primary" />
                    <CardContent className="p-0">
                        <div className="border-b bg-muted/40 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full bg-destructive/70" />
                                <span className="size-3 rounded-full bg-yellow-500/70" />
                                <span className="size-3 rounded-full bg-emerald-500/70" />
                                <span className="ml-3 font-mono text-xs text-muted-foreground">vektor://status/{status}</span>
                            </div>
                        </div>

                        <div className="space-y-5 p-6 md:p-8">
                            <div className={cn(
                                "flex aspect-square max-h-72 items-center justify-center rounded-3xl border bg-background/80 p-8",
                                isServerError && "bg-gradient-to-br from-background to-muted/70"
                            )}>
                                {isServerError ? <ServerErrorIllustration status={status} /> : isForbidden ? <ForbiddenIllustration /> : <RouteIllustration />}
                            </div>

                            <div className="rounded-2xl border bg-muted/30 p-4 font-mono text-sm leading-6">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Code2 className="size-4" />
                                    <span>diagnostics.log</span>
                                </div>
                                <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">
{isServerError
    ? `status: ${status}\nservice: backend\nmessage: server_error\nhint: retry_later`
    : isForbidden
        ? `status: ${status}\nroute: forbidden\nhint: login_or_request_access`
        : `status: ${status}\nroute: not_found\nhint: check_slug_or_search`}
                                </pre>
                            </div>

                            <Button asChild variant="ghost" className="w-full justify-between">
                                <Link href="/questions">
                                    Перейти к вопросам сообщества
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </section>
    )
}


function ForbiddenIllustration() {
    return (
        <div className="relative flex size-full min-h-52 items-center justify-center">
            <div className="absolute inset-4 rounded-3xl border border-primary/20 bg-primary/5" />
            <div className="relative rounded-3xl border bg-card px-6 py-5 text-center shadow-lg">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 font-mono text-2xl font-semibold text-primary ring-1 ring-primary/25">
                    403
                </div>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    access denied
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <span className="h-2 rounded-full bg-primary/80" />
                    <span className="h-2 rounded-full bg-primary/40" />
                    <span className="h-2 rounded-full bg-muted" />
                </div>
            </div>
        </div>
    )
}

function RouteIllustration() {
    return (
        <svg viewBox="0 0 320 320" role="img" aria-label="Маршрут не найден" className="h-full w-full max-w-72">
            
            <text x="160" y="164" textAnchor="middle" className="fill-current font-mono text-[58px] font-bold" opacity="0.72">404</text>
        </svg>
    )
}

function ServerErrorIllustration({ status }: { status: string }) {
    return (
        <div className="relative flex size-full min-h-52 items-center justify-center overflow-hidden">
            <div className="absolute inset-4 rounded-3xl border border-primary/20 bg-primary/5" />
            <div className="absolute left-10 top-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute bottom-8 right-8 h-28 w-28 rounded-full bg-destructive/10 blur-2xl" />
            <div className="relative w-full max-w-64 rounded-3xl border bg-card/95 p-5 shadow-lg">
                <div className="flex items-center justify-between gap-3 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                            <ServerCrash className="size-6" />
                        </div>
                        <div>
                            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">server</p>
                            <p className="text-sm font-semibold">Ошибка ответа</p>
                        </div>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 font-mono text-sm text-muted-foreground">{status}</span>
                </div>
                <div className="mt-5 space-y-3">
                    <div className="h-2 rounded-full bg-primary/70" />
                    <div className="h-2 w-4/5 rounded-full bg-muted" />
                    <div className="h-2 w-2/3 rounded-full bg-muted" />
                </div>
            </div>
        </div>
    )
}
