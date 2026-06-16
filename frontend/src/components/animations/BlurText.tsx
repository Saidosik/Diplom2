"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type BlurTextProps = {
    text: string
    className?: string
    delay?: number
    step?: number
    by?: "word" | "char"
}

export function BlurText({
    text,
    className,
    delay = 80,
    step = 34,
    by = "word",
}: BlurTextProps) {
    const [visible, setVisible] = React.useState(false)
    const pieces = React.useMemo(() => (by === "word" ? text.split(" ") : Array.from(text)), [by, text])

    React.useEffect(() => {
        const timer = window.setTimeout(() => setVisible(true), delay)
        return () => window.clearTimeout(timer)
    }, [delay])

    return (
        <span className={cn("inline-block", className)} aria-label={text}>
            {pieces.map((piece, index) => (
                <span
                    key={`${piece}-${index}`}
                    aria-hidden="true"
                    className="inline-block will-change-transform"
                    style={{
                        opacity: visible ? 1 : 0,
                        filter: visible ? "blur(0px)" : "blur(10px)",
                        transform: visible ? "translateY(0)" : "translateY(14px)",
                        transition: "opacity 520ms ease, filter 520ms ease, transform 520ms ease",
                        transitionDelay: `${index * step}ms`,
                    }}
                >
                    {piece}
                    {by === "word" && index < pieces.length - 1 ? "\u00a0" : null}
                </span>
            ))}
        </span>
    )
}
