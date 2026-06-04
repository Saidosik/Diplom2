"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function HomeReveal({
    children,
    className,
}: {
    children: ReactNode
    className?: string
    delay?: number
}) {
    return <div className={className}>{children}</div>
}

export function HomeInteractive({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return <div className={cn("h-full transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]", className)}>{children}</div>
}

export function HomePulseLine({ className }: { className?: string }) {
    return (
        <span className={cn("pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden", className)}>
            <span className="block h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </span>
    )
}
