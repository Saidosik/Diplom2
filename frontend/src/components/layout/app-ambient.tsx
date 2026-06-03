"use client"

import { motion, useReducedMotion } from "framer-motion"

export function AppAmbient() {
    const shouldReduceMotion = useReducedMotion()

    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="vektor-grid absolute inset-0 opacity-70" />
            <motion.div
                className="absolute -left-24 top-10 h-96 w-96 bg-primary/20 blur-3xl"
                animate={shouldReduceMotion ? undefined : { x: [0, 28, -12, 0], y: [0, -18, 16, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute right-0 top-20 h-80 w-80 bg-cyan-400/10 blur-3xl"
                animate={shouldReduceMotion ? undefined : { x: [0, -24, 18, 0], y: [0, 22, -10, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 bg-fuchsia-400/10 blur-3xl"
                animate={shouldReduceMotion ? undefined : { scale: [1, 1.08, 0.96, 1] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    )
}
