"use client"

import * as React from "react"

type MotionValue = number | string
type MotionStyle = React.CSSProperties & {
    opacity?: MotionValue
    y?: MotionValue
}

type Transition = {
    duration?: number
    ease?: string
    staggerChildren?: number
    delay?: number
}

type VariantName = string
type Variants = Record<VariantName, MotionStyle & { transition?: Transition } | { transition?: Transition }>

type MotionProps = {
    initial?: VariantName | MotionStyle | false
    animate?: VariantName | MotionStyle
    exit?: VariantName | MotionStyle
    whileHover?: MotionStyle
    variants?: Variants
    transition?: Transition
}

type MotionDivProps = Omit<React.ComponentPropsWithoutRef<"div">, keyof MotionProps> & MotionProps
type MotionTrProps = Omit<React.ComponentPropsWithoutRef<"tr">, keyof MotionProps> & MotionProps

function resolveMotionStyle(value: MotionDivProps["animate"], variants?: Variants): React.CSSProperties {
    if (!value || typeof value === "boolean") {
        return {}
    }

    const style = typeof value === "string" ? variants?.[value] : value

    if (!style) {
        return {}
    }

    const motionStyle = style as MotionStyle & { transition?: Transition }
    const { y } = motionStyle
    const rest = { ...motionStyle }
    delete rest.y
    delete rest.transition

    return {
        ...rest,
        transform: y ? `translateY(${typeof y === "number" ? `${y}px` : y})` : rest.transform,
    }
}

function transitionStyle(transition?: Transition): React.CSSProperties {
    if (!transition || transition.duration === 0) {
        return {}
    }

    return {
        transitionDuration: `${transition.duration}s`,
        transitionDelay: transition.delay ? `${transition.delay}s` : undefined,
        transitionTimingFunction: transition.ease === "easeOut" ? "ease-out" : "ease",
        transitionProperty: "opacity, transform, background-color, border-color, box-shadow",
    }
}

const MotionDiv = React.forwardRef<HTMLDivElement, MotionDivProps>(function MotionDiv(
    { animate, variants, transition, style, onMouseEnter, onMouseLeave, whileHover, ...props },
    ref
) {
    const [hovered, setHovered] = React.useState(false)
    const animateStyle = resolveMotionStyle(animate, variants)
    const hoverStyle = hovered ? resolveMotionStyle(whileHover) : {}

    return (
        <div
            ref={ref}
            style={{ ...transitionStyle(transition), ...animateStyle, ...hoverStyle, ...style }}
            onMouseEnter={(event) => {
                setHovered(true)
                onMouseEnter?.(event)
            }}
            onMouseLeave={(event) => {
                setHovered(false)
                onMouseLeave?.(event)
            }}
            {...props}
        />
    )
})

const MotionTr = React.forwardRef<HTMLTableRowElement, MotionTrProps>(function MotionTr(
    { animate, variants, transition, style, onMouseEnter, onMouseLeave, whileHover, ...props },
    ref
) {
    const [hovered, setHovered] = React.useState(false)
    const animateStyle = resolveMotionStyle(animate, variants)
    const hoverStyle = hovered ? resolveMotionStyle(whileHover) : {}

    return (
        <tr
            ref={ref}
            style={{ ...transitionStyle(transition), ...animateStyle, ...hoverStyle, ...style }}
            onMouseEnter={(event) => {
                setHovered(true)
                onMouseEnter?.(event)
            }}
            onMouseLeave={(event) => {
                setHovered(false)
                onMouseLeave?.(event)
            }}
            {...props}
        />
    )
})

export const motion = {
    div: MotionDiv,
    tr: MotionTr,
}

export function AnimatePresence({ children }: { children: React.ReactNode; mode?: "sync" | "wait" | "popLayout"; initial?: boolean }) {
    return <>{children}</>
}

export function useReducedMotion() {
    const [reduced, setReduced] = React.useState(false)

    React.useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)")
        const update = () => setReduced(query.matches)
        update()
        query.addEventListener("change", update)

        return () => query.removeEventListener("change", update)
    }, [])

    return reduced
}
