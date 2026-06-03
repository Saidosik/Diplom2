import { BookOpen, Flame, GraduationCap } from "lucide-react"

import { ProfileActivityHeatmap } from "@/features/profile/components/profile-activity-heatmap"
import { Progress } from "@/components/ui/progress"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function ProfileLearningCard() {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="size-4" />
                    Учебная активность
                </CardTitle>

                <CardDescription>
                    Прогресс обучения, уроки и задания.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                <ProfileActivityHeatmap />

                <div className="grid gap-3 sm:grid-cols-3">
                    <LearningMetric
                        icon={Flame}
                        value="0"
                        label="дней подряд"
                    />

                    <LearningMetric
                        icon={BookOpen}
                        value="0"
                        label="уроков пройдено"
                    />

                    <LearningMetric
                        icon={GraduationCap}
                        value="0"
                        label="задач решено"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Общий прогресс обучения
                        </span>

                        <span className="font-medium">
                            0%
                        </span>
                    </div>

                    <Progress value={0} />
                </div>
            </CardContent>
        </Card>
    )
}

function LearningMetric({
    icon: Icon,
    value,
    label,
}: {
    icon: React.ElementType
    value: string
    label: string
}) {
    return (
        <div className="rounded-xl border bg-muted/30 p-4">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-background text-muted-foreground">
                <Icon className="size-4" />
            </div>

            <p className="text-2xl font-semibold tracking-tight">
                {value}
            </p>

            <p className="text-xs text-muted-foreground">
                {label}
            </p>
        </div>
    )
}