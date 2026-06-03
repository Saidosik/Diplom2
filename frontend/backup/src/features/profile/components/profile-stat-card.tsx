import type { ElementType } from "react"

import { Card, CardContent } from "@/components/ui/card"

type ProfileStatCardProps = {
    title: string
    value: string
    description: string
    icon: ElementType
}

export function ProfileStatCard({
    title,
    value,
    description,
    icon: Icon,
}: ProfileStatCardProps) {
    return (
        <Card size="sm" className="bg-card shadow-sm">
            <CardContent className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                        {title}
                    </p>

                    <p className="text-2xl font-semibold tracking-tight">
                        {value}
                    </p>

                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    )
}