"use client"

import type { ReactNode } from "react"

export function PageTransition({ children }: { children: ReactNode }) {
    return <div className="min-w-0">{children}</div>
}
