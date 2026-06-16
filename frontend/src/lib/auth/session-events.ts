export const SESSION_CHANGED_EVENT = "vector:session-changed"

export function notifySessionChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
    }
}
