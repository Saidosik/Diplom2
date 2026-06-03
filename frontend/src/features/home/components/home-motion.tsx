"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

export function HomeReveal({
    children,
    className,
    delay = 0,
}: {
    children: ReactNode
    className?: string
    delay?: number
}) {
    const shouldReduceMotion = useReducedMotion()

    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-72px" }}
            transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

export function HomeInteractive({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    const shouldReduceMotion = useReducedMotion()

    return (
        <motion.div
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn("h-full", className)}
        >
            {children}
        </motion.div>
    )
}

export function HomePulseLine({ className }: { className?: string }) {
    const shouldReduceMotion = useReducedMotion()

    return (
        <span className={cn("pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden", className)}>
            <motion.span
                className="block h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={shouldReduceMotion ? undefined : { x: ["-120%", "320%"] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            />
        </span>
    )
}
