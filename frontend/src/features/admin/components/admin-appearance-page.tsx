"use client"

import * as React from "react"
import { RotateCcw, Save, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { BackgroundRenderer } from "@/components/backgrounds/BackgroundRenderer"
import {
    type AppearanceSettings,
    type BackgroundEffect,
    type BackgroundScope,
    type BackgroundScopeSettings,
    defaultAppearanceSettings,
    effectLabels,
    emitAppearanceSettingsUpdated,
    normalizeAppearanceSettings,
    resetAppearanceSettings,
    scopeLabels,
    updateAppearanceSettings,
} from "@/components/backgrounds/appearance-settings"
import { useAppearanceSettings } from "@/components/backgrounds/use-appearance-settings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { AdminPageHeader } from "@/features/admin/components/admin-shared"
import { cn } from "@/lib/utils"

const scopes: BackgroundScope[] = ["main", "auth", "admin"]
const effects: BackgroundEffect[] = ["dark-veil", "aurora", "light-rays", "none"]

function formatPercent(value: number) {
    return `${Math.round(value * 100)}%`
}

function errorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message
    }

    return "Не удалось сохранить настройки"
}

function SliderField({
    label,
    hint,
    value,
    min,
    max,
    step,
    format = String,
    onChange,
}: {
    label: string
    hint?: string
    value: number
    min: number
    max: number
    step: number
    format?: (value: number) => string
    onChange: (value: number) => void
}) {
    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium">{label}</p>
                    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">{format(value)}</Badge>
            </div>
            <Slider
                min={min}
                max={max}
                step={step}
                value={[value]}
                onValueChange={(next) => onChange(next[0] ?? value)}
            />
        </div>
    )
}

function NativeSelect({
    value,
    onChange,
}: {
    value: BackgroundEffect
    onChange: (value: BackgroundEffect) => void
}) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value as BackgroundEffect)}
            className="h-10 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
            {effects.map((effect) => (
                <option key={effect} value={effect}>{effectLabels[effect]}</option>
            ))}
        </select>
    )
}

export function AdminAppearancePage() {
    const { settings, isLoading, error, refresh } = useAppearanceSettings()
    const [draft, setDraft] = React.useState<AppearanceSettings>(defaultAppearanceSettings)
    const [activeScope, setActiveScope] = React.useState<BackgroundScope>("main")
    const [isDirty, setIsDirty] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const current = draft[activeScope]

    React.useEffect(() => {
        if (!isDirty) {
            setDraft(settings)
        }
    }, [settings, isDirty])

    const updateScope = React.useCallback((scope: BackgroundScope, next: Partial<BackgroundScopeSettings>) => {
        setDraft((currentDraft) => normalizeAppearanceSettings({
            ...currentDraft,
            [scope]: {
                ...currentDraft[scope],
                ...next,
            },
        }))
        setIsDirty(true)
    }, [])

    const save = React.useCallback(async () => {
        setIsSaving(true)

        try {
            const saved = await updateAppearanceSettings(draft)
            setDraft(saved)
            setIsDirty(false)
            emitAppearanceSettingsUpdated(saved)
            toast.success("Настройки внешнего вида сохранены")
        } catch (saveError) {
            toast.error(errorMessage(saveError))
        } finally {
            setIsSaving(false)
        }
    }, [draft])

    const reset = React.useCallback(async () => {
        setIsSaving(true)

        try {
            const saved = await resetAppearanceSettings()
            setDraft(saved)
            setIsDirty(false)
            emitAppearanceSettingsUpdated(saved)
            toast.success("Настройки внешнего вида сброшены")
        } catch (resetError) {
            toast.error(errorMessage(resetError))
        } finally {
            setIsSaving(false)
        }
    }, [])

    const reload = React.useCallback(async () => {
        const fresh = await refresh()
        setDraft(fresh)
        setIsDirty(false)
    }, [refresh])

    return (
        <div className="grid gap-6">
            <AdminPageHeader
                title="Внешний вид"
                description="Настройка фоновых эффектов для auth flow, основного интерфейса и админ-панели. Значения сохраняются в БД и отдаются через Laravel Cache/Redis."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={reload} disabled={isLoading || isSaving}>
                            Обновить
                        </Button>
                        <Button variant="outline" size="sm" onClick={reset} disabled={isSaving}>
                            <RotateCcw className="size-4" />
                            Сбросить
                        </Button>
                        <Button size="sm" onClick={save} disabled={!isDirty || isSaving}>
                            <Save className="size-4" />
                            {isSaving ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </div>
                }
            />

            {error ? (
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardContent className="py-4 text-sm text-destructive">
                        {error}. Сейчас показаны значения по умолчанию.
                    </CardContent>
                </Card>
            ) : null}

            {isDirty ? (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-4 text-sm text-primary">
                        Есть несохранённые изменения. Предпросмотр справа обновляется сразу, но пользователи увидят настройки после сохранения.
                    </CardContent>
                </Card>
            ) : null}

            <Card className="bg-card/88 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        Фоновые эффекты
                    </CardTitle>
                    <CardDescription>
                        Админка отправляет настройки в Laravel. Backend хранит JSON в таблице app_settings и обновляет кеш Redis через Cache::forever.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="grid content-start gap-2">
                        {scopes.map((scope) => (
                            <button
                                key={scope}
                                type="button"
                                onClick={() => setActiveScope(scope)}
                                className={cn(
                                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5",
                                    activeScope === scope
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-border bg-background/50"
                                )}
                            >
                                <span className="font-medium">{scopeLabels[scope]}</span>
                                <Badge variant={draft[scope].enabled ? "default" : "secondary"}>
                                    {draft[scope].enabled ? effectLabels[draft[scope].effect] : "Выключен"}
                                </Badge>
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <div className="grid gap-5">
                            <div className="grid gap-3 rounded-2xl border bg-background/50 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium">Включить фон</p>
                                        <p className="text-xs text-muted-foreground">Отключите, если на странице нужен полностью статичный фон.</p>
                                    </div>
                                    <Switch
                                        checked={current.enabled}
                                        onCheckedChange={(enabled) => updateScope(activeScope, { enabled })}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <p className="text-sm font-medium">Компонент</p>
                                    <NativeSelect
                                        value={current.effect}
                                        onChange={(effect) => updateScope(activeScope, { effect })}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-5 rounded-2xl border bg-background/50 p-4">
                                <SliderField
                                    label="Интенсивность"
                                    hint="Главная прозрачность эффекта. Для рабочих страниц лучше 8–20%."
                                    value={current.intensity}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    format={formatPercent}
                                    onChange={(intensity) => updateScope(activeScope, { intensity })}
                                />
                                <SliderField
                                    label="Скорость"
                                    hint="Чем ниже скорость, тем спокойнее интерфейс."
                                    value={current.speed}
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    format={(value) => `${value.toFixed(2)}x`}
                                    onChange={(speed) => updateScope(activeScope, { speed })}
                                />
                                <SliderField
                                    label="Затемнение поверх фона"
                                    hint="Повышайте значение, если фон начинает отвлекать от карточек и таблиц."
                                    value={current.overlayOpacity}
                                    min={0}
                                    max={0.98}
                                    step={0.01}
                                    format={formatPercent}
                                    onChange={(overlayOpacity) => updateScope(activeScope, { overlayOpacity })}
                                />
                                <SliderField
                                    label="Сетка"
                                    hint="Тонкая техническая фактура интерфейса."
                                    value={current.gridOpacity}
                                    min={0}
                                    max={0.35}
                                    step={0.01}
                                    format={formatPercent}
                                    onChange={(gridOpacity) => updateScope(activeScope, { gridOpacity })}
                                />
                            </div>

                            <div className="grid gap-5 rounded-2xl border bg-background/50 p-4">
                                <SliderField
                                    label="Hue shift"
                                    hint="Сдвиг оттенка для Dark Veil."
                                    value={current.hueShift}
                                    min={-180}
                                    max={180}
                                    step={1}
                                    format={(value) => `${Math.round(value)}°`}
                                    onChange={(hueShift) => updateScope(activeScope, { hueShift })}
                                />
                                <SliderField
                                    label="Шум"
                                    value={current.noiseIntensity}
                                    min={0}
                                    max={0.12}
                                    step={0.001}
                                    format={(value) => value.toFixed(3)}
                                    onChange={(noiseIntensity) => updateScope(activeScope, { noiseIntensity })}
                                />
                                <SliderField
                                    label="Scanlines"
                                    value={current.scanlineIntensity}
                                    min={0}
                                    max={0.14}
                                    step={0.001}
                                    format={(value) => value.toFixed(3)}
                                    onChange={(scanlineIntensity) => updateScope(activeScope, { scanlineIntensity })}
                                />
                                <SliderField
                                    label="Warp"
                                    hint="Искажение движения. Для админки лучше оставлять низким."
                                    value={current.warpAmount}
                                    min={0}
                                    max={0.3}
                                    step={0.005}
                                    format={(value) => value.toFixed(3)}
                                    onChange={(warpAmount) => updateScope(activeScope, { warpAmount })}
                                />
                            </div>
                        </div>

                        <div className="grid content-start gap-4">
                            <div className="relative min-h-[360px] overflow-hidden rounded-2xl border bg-background shadow-2xl">
                                <BackgroundRenderer scope={activeScope} settingsOverride={current} />
                                <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-5">
                                    <Badge className="mb-auto w-fit">Предпросмотр</Badge>
                                    <h2 className="text-2xl font-semibold">{scopeLabels[activeScope]}</h2>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Так фон будет выглядеть за карточками, таблицами и рабочими блоками интерфейса.
                                    </p>
                                    <div className="mt-4 grid gap-2 rounded-xl border bg-card/80 p-3 text-xs backdrop-blur">
                                        <div className="h-2 w-3/4 rounded-full bg-primary/40" />
                                        <div className="h-2 w-1/2 rounded-full bg-muted" />
                                        <div className="h-2 w-2/3 rounded-full bg-muted" />
                                    </div>
                                </div>
                            </div>

                            <Card className="bg-card/88 backdrop-blur-xl" size="sm">
                                <CardHeader>
                                    <CardTitle>Рекомендация</CardTitle>
                                    <CardDescription>
                                        Для всего приложения оптимально оставить Dark Veil с интенсивностью 12–18%, а для админки — 6–10%.
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
