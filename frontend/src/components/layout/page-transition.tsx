"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"

export function PageTransition({ children }: { children: ReactNode }) {
    const shouldReduceMotion = useReducedMotion()

    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
        >
            {children}
        </motion.div>
    )
}
