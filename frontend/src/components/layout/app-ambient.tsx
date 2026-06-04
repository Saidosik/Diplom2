"use client"

export function AppAmbient() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="vektor-grid absolute inset-0 opacity-70" />
            <div className="absolute -left-24 top-10 h-96 w-96 bg-primary/20 blur-3xl" />
            <div className="absolute right-0 top-20 h-80 w-80 bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 bg-fuchsia-400/10 blur-3xl" />
        </div>
    )
}
