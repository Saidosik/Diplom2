import { cn } from "@/lib/utils"

const cells = Array.from({ length: 84 })

export function ProfileActivityHeatmap() {
    return (
        <div className="rounded-xl border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">
                        Активность за последние недели
                    </p>

                    <p className="text-xs text-muted-foreground">
                        Отображение публикаций, вопросов, ответов и комментариев пользователя.
                    </p>
                </div>

                <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <span>меньше</span>
                    <HeatmapCell intensity={0} />
                    <HeatmapCell intensity={1} />
                    <HeatmapCell intensity={2} />
                    <HeatmapCell intensity={3} />
                    <span>больше</span>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-1 sm:grid-cols-21">
                {cells.map((_, index) => (
                    <HeatmapCell key={index} intensity={0} />
                ))}
            </div>
        </div>
    )
}

function HeatmapCell({
    intensity,
}: {
    intensity: 0 | 1 | 2 | 3
}) {
    return (
        <div
            className={cn(
                "size-3 rounded-[3px] border",
                intensity === 0 && "border-border bg-muted",
                intensity === 1 && "border-emerald-500/20 bg-emerald-500/25",
                intensity === 2 && "border-emerald-500/30 bg-emerald-500/50",
                intensity === 3 && "border-emerald-500/40 bg-emerald-500/80"
            )}
        />
    )
}