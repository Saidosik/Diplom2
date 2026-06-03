import { Suspense } from "react"
import { CodePlaygroundPage } from "@/features/playground/components/code-playground-page"

export const dynamic = "force-dynamic"

export default function PlaygroundPage() {
    return (
        <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка песочницы...</div>}>
            <CodePlaygroundPage />
        </Suspense>
    )
}
