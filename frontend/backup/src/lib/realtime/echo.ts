import Echo from "laravel-echo"
import Pusher from "pusher-js"

declare global {
    interface Window {
        Pusher?: typeof Pusher
        __vektorEcho?: Echo<any>
    }
}

function boolEnv(value: string | undefined, fallback = false) {
    if (value === undefined) return fallback
    return value === "true" || value === "1"
}

export function getEcho() {
    if (typeof window === "undefined") return null

    if (window.__vektorEcho) {
        return window.__vektorEcho
    }

    window.Pusher = Pusher

    window.__vektorEcho = new Echo({
        broadcaster: "pusher",
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || "local",
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname,
        wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080),
        wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080),
        forceTLS: boolEnv(process.env.NEXT_PUBLIC_REVERB_FORCE_TLS, false),
        enabledTransports: ["ws", "wss"],
        cluster: process.env.NEXT_PUBLIC_REVERB_CLUSTER || "mt1",
        disableStats: true,
        authEndpoint: "/api/laravel/broadcasting/auth",
        auth: {
            headers: {
                Accept: "application/json",
            },
        },
    })

    return window.__vektorEcho
}
