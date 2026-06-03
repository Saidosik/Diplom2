"use client"

import * as React from "react"
import type { ElementType } from "react"
import { Monitor, MonitorCog, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ThemeMode = "dark" | "light" | "system"

const themeTitles: Record<ThemeMode, string> = {
    dark: "Тёмная тема включена",
    light: "Светлая тема включена",
    system: "Тема системы включена",
}

export function SettingsAppearanceCard() {
    const { theme, resolvedTheme, systemTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const currentTheme = mounted ? (theme as ThemeMode | undefined) ?? "system" : "system"
    const systemLabel = mounted
        ? systemTheme === "light"
            ? "Сейчас система использует светлую тему."
            : "Сейчас система использует тёмную тему."
        : "Тема будет определена после загрузки страницы."

    function updateTheme(nextTheme: ThemeMode) {
        setTheme(nextTheme)
        toast.success(themeTitles[nextTheme])
    }

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MonitorCog className="size-5 text-primary" />
                    Оформление интерфейса
                </CardTitle>
                <CardDescription>
                    Выберите тёмную, светлую или системную тему. Настройка сохраняется в браузере.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                    <ThemePreview
                        icon={Moon}
                        title="Тёмная тема"
                        description="Контрастный режим для работы вечером и в тёмной среде."
                        active={currentTheme === "dark"}
                        onClick={() => updateTheme("dark")}
                    />
                    <ThemePreview
                        icon={Sun}
                        title="Светлая тема"
                        description="Светлый режим для работы днём или при ярком освещении."
                        active={currentTheme === "light"}
                        onClick={() => updateTheme("light")}
                    />
                    <ThemePreview
                        icon={Monitor}
                        title="Как в системе"
                        description="Сайт автоматически повторяет тему операционной системы."
                        active={currentTheme === "system"}
                        onClick={() => updateTheme("system")}
                    />
                </div>

                <div className="border bg-muted/20 p-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className="font-medium">Текущий режим</p>
                            <p className="text-sm leading-6 text-muted-foreground">
                                {currentTheme === "system"
                                    ? systemLabel
                                    : resolvedTheme === "light"
                                      ? "Сейчас включена светлая тема."
                                      : "Сейчас включена тёмная тема."}
                            </p>
                        </div>
                        <Badge variant="secondary">
                            {currentTheme === "system" ? "системная" : currentTheme === "light" ? "светлая" : "тёмная"}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ThemePreview({
    icon: Icon,
    title,
    description,
    active,
    onClick,
}: {
    icon: ElementType
    title: string
    description: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="border bg-background p-5 text-left transition-colors hover:border-primary/50"
        >
            <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
                {active ? <Badge>активна</Badge> : <Badge variant="outline">выбрать</Badge>}
            </div>
            <div className="space-y-1.5">
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
        </button>
    )
}
