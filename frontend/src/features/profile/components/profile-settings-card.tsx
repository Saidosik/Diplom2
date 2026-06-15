"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Camera, LoaderCircle, RotateCcw, Save, Trash2, TriangleAlert, UserRound } from "lucide-react"
import { toast } from "sonner"

import type { UpdateProfileDto, User } from "@/features/auth/types"
import { deleteAccount, deleteAvatar, updateAvatar, updateProfile } from "@/features/auth/api"
import { UserAvatar } from "@/features/users/components/user-avatar"
import { safeRequest } from "@/lib/http/api-errors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function getInitialForm(user: User): UpdateProfileDto {
    return {
        name: user.name ?? "",
        email: user.email ?? "",
        headline: user.headline ?? "",
        bio: user.bio ?? "",
        location: user.location ?? "",
        direction: user.direction ?? "",
        website_url: user.website_url ?? "",
        github_url: user.github_url ?? "",
        profile_visibility: user.profile_visibility === "private" ? "private" : "public",
        show_email_publicly: Boolean(user.show_email_publicly),
        show_friends_publicly: user.show_friends_publicly ?? true,
        show_files_publicly: user.show_files_publicly ?? true,
        show_activity_publicly: user.show_activity_publicly ?? true,
    }
}

function normalizeUrl(url?: string | null) {
    if (!url) return ""
    return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`
}

type ProfileSettingsCardProps = {
    user: User
}

export function ProfileSettingsCard({ user }: ProfileSettingsCardProps) {
    const router = useRouter()

    const [currentUser, setCurrentUser] = React.useState(user)
    const [form, setForm] = React.useState<UpdateProfileDto>(() => getInitialForm(user))
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
    const [isSavingProfile, setIsSavingProfile] = React.useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
    const [isDeletingAvatar, setIsDeletingAvatar] = React.useState(false)
    const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)

    React.useEffect(() => {
        setCurrentUser(user)
        setForm(getInitialForm(user))
    }, [user])

    React.useEffect(() => {
        if (!avatarFile) {
            setAvatarPreview(null)
            return
        }

        const url = URL.createObjectURL(avatarFile)
        setAvatarPreview(url)

        return () => {
            URL.revokeObjectURL(url)
        }
    }, [avatarFile])

    const initialForm = React.useMemo(() => getInitialForm(currentUser), [currentUser])
    const hasUnsavedChanges = React.useMemo(() => {
        return JSON.stringify(form) !== JSON.stringify(initialForm)
    }, [form, initialForm])

    function updateField(field: keyof UpdateProfileDto, value: string | boolean) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }))
    }

    function resetForm() {
        setForm(initialForm)
        toast.success("Изменения формы сброшены")
    }

    async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSavingProfile(true)

        const payload: UpdateProfileDto = {
            ...form,
            website_url: normalizeUrl(form.website_url),
            github_url: normalizeUrl(form.github_url),
        }

        const result = await safeRequest(updateProfile(payload))

        if (!result.success) {
            toast.error(result.error?.message ?? "Не удалось сохранить профиль")
            setIsSavingProfile(false)
            return
        }

        setCurrentUser(result.data)
        setForm(getInitialForm(result.data))
        toast.success("Профиль обновлён")
        router.refresh()
        setIsSavingProfile(false)
    }

    async function handleAvatarUpload() {
        if (!avatarFile) {
            toast.error("Сначала выберите изображение")
            return
        }

        setIsUploadingAvatar(true)
        const result = await safeRequest(updateAvatar(avatarFile))

        if (!result.success) {
            toast.error(result.error?.message ?? "Не удалось обновить аватар")
            setIsUploadingAvatar(false)
            return
        }

        setCurrentUser(result.data)
        setAvatarFile(null)
        toast.success("Аватар обновлён")
        router.refresh()
        setIsUploadingAvatar(false)
    }

    async function handleAvatarDelete() {
        setIsDeletingAvatar(true)
        const result = await safeRequest(deleteAvatar())

        if (!result.success) {
            toast.error(result.error?.message ?? "Не удалось удалить аватар")
            setIsDeletingAvatar(false)
            return
        }

        if (result.data) {
            setCurrentUser(result.data)
            setForm(getInitialForm(result.data))
        }

        toast.success("Аватар удалён")
        router.refresh()
        setIsDeletingAvatar(false)
    }

    async function handleAccountDelete() {
        setIsDeletingAccount(true)
        const result = await safeRequest(deleteAccount())

        if (!result.success) {
            toast.error(result.error?.message ?? "Не удалось удалить аккаунт")
            setIsDeletingAccount(false)
            return
        }

        toast.success("Аккаунт удалён")
        router.push("/auth?mode=login")
        router.refresh()
    }

    return (
        <div className="grid gap-6 lg:grid-cols-12">
            <Card className="shadow-sm lg:col-span-8">
                <CardHeader>
                    <CardTitle>Редактирование профиля</CardTitle>
                    <CardDescription>
                        Обновите данные профиля. Эта информация будет отображаться в вашем аккаунте.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form className="space-y-5" onSubmit={handleProfileSubmit}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="profile-name">Имя</Label>
                                <Input
                                    id="profile-name"
                                    value={form.name ?? ""}
                                    onChange={(event) => updateField("name", event.target.value)}
                                    placeholder="Имя пользователя"
                                    autoComplete="name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile-email">Email</Label>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    value={form.email ?? ""}
                                    onChange={(event) => updateField("email", event.target.value)}
                                    placeholder="user@example.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-headline">Короткое описание</Label>
                            <Input
                                id="profile-headline"
                                value={form.headline ?? ""}
                                onChange={(event) => updateField("headline", event.target.value)}
                                placeholder="Например: студент, backend-разработчик, автор публикаций"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-bio">О себе</Label>
                            <Textarea
                                id="profile-bio"
                                value={form.bio ?? ""}
                                onChange={(event) => updateField("bio", event.target.value)}
                                placeholder="Кратко расскажите о себе, интересах и опыте"
                                className="min-h-32"
                            />
                            <p className="text-xs text-muted-foreground">Краткое описание профиля, которое увидят другие пользователи.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="profile-location">Город</Label>
                                <Input
                                    id="profile-location"
                                    value={form.location ?? ""}
                                    onChange={(event) => updateField("location", event.target.value)}
                                    placeholder="Казань"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile-direction">Направление</Label>
                                <Input
                                    id="profile-direction"
                                    value={form.direction ?? ""}
                                    onChange={(event) => updateField("direction", event.target.value)}
                                    placeholder="Backend / DevOps / Security"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="profile-website">Сайт</Label>
                                <Input
                                    id="profile-website"
                                    value={form.website_url ?? ""}
                                    onChange={(event) => updateField("website_url", event.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="profile-github">GitHub</Label>
                                <Input
                                    id="profile-github"
                                    value={form.github_url ?? ""}
                                    onChange={(event) => updateField("github_url", event.target.value)}
                                    placeholder="https://github.com/username"
                                />
                            </div>
                        </div>


                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-center">
                                <div>
                                    <Label>Приватность профиля</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Закрытый профиль показывает другим пользователям только имя и аватар. Полную активность видят друзья, модераторы и администраторы.
                                    </p>
                                </div>
                                <Select value={form.profile_visibility ?? "public"} onValueChange={(value) => updateField("profile_visibility", value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="public">Публичный</SelectItem>
                                        <SelectItem value="private">Закрытый</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
                            <PrivacyToggle
                                title="Показывать email"
                                description="Email появится только в публичном профиле."
                                checked={Boolean(form.show_email_publicly)}
                                onCheckedChange={(checked) => updateField("show_email_publicly", checked)}
                            />
                            <PrivacyToggle
                                title="Показывать друзей"
                                description="Список друзей будет виден другим участникам."
                                checked={form.show_friends_publicly ?? true}
                                onCheckedChange={(checked) => updateField("show_friends_publicly", checked)}
                            />
                            <PrivacyToggle
                                title="Показывать файлы"
                                description="В профиле будут видны публичные файлы из хранилища."
                                checked={form.show_files_publicly ?? true}
                                onCheckedChange={(checked) => updateField("show_files_publicly", checked)}
                            />
                            <PrivacyToggle
                                title="Показывать активность"
                                description="Публичная лента действий будет доступна в профиле."
                                checked={form.show_activity_publicly ?? true}
                                onCheckedChange={(checked) => updateField("show_activity_publicly", checked)}
                            />
                        </div>

                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        {hasUnsavedChanges ? "Есть несохранённые изменения" : "Все изменения сохранены"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        После сохранения новые данные сразу обновятся в шапке профиля.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button type="button" variant="outline" onClick={resetForm} disabled={!hasUnsavedChanges || isSavingProfile}>
                                        <RotateCcw className="size-4" />
                                        Сбросить
                                    </Button>

                                    <Button type="submit" disabled={isSavingProfile || !hasUnsavedChanges}>
                                        {isSavingProfile ? (
                                            <LoaderCircle className="size-4 animate-spin" />
                                        ) : (
                                            <Save className="size-4" />
                                        )}
                                        Сохранить профиль
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <aside className="space-y-6 lg:col-span-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Аватар</CardTitle>
                        <CardDescription>JPG, PNG или WEBP до 2 МБ.</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Предпросмотр аватара" className="size-16 rounded-full border object-cover shadow-sm" />
                            ) : (
                                <UserAvatar user={currentUser} size="lg" />
                            )}

                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{currentUser.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                                {avatarPreview && <p className="text-xs text-emerald-500">Выбран новый аватар</p>}
                            </div>
                        </div>

                        <Input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                        />

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            <Button type="button" onClick={handleAvatarUpload} disabled={isUploadingAvatar || !avatarFile}>
                                {isUploadingAvatar ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
                                Загрузить
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAvatarDelete}
                                disabled={isDeletingAvatar || !currentUser.avatar_url}
                            >
                                {isDeletingAvatar ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                Удалить
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-500/20 shadow-sm">
                    <CardHeader>
                        <CardTitle>Совет</CardTitle>
                        <CardDescription>Как сделать профиль более полезным для других пользователей.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex gap-2">
                            <TriangleAlert className="mt-0.5 size-4 text-amber-500" />
                            <p>Добавь короткий headline, чтобы было сразу понятно, кто ты и чем занимаешься.</p>
                        </div>
                        <div className="flex gap-2">
                            <TriangleAlert className="mt-0.5 size-4 text-amber-500" />
                            <p>Укажи GitHub и сайт — это особенно полезно для публикаций, ответов и портфолио.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-destructive/30 shadow-sm">
                    <CardHeader>
                        <CardTitle>Удаление аккаунта</CardTitle>
                        <CardDescription>
                            Аккаунт будет удалён из системы. В текущей БД используется мягкое удаление, поэтому запись можно восстановить через администратора.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full">
                                    <Trash2 className="size-4" />
                                    Удалить аккаунт
                                </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogMedia>
                                        <UserRound className="size-8 text-destructive" />
                                    </AlertDialogMedia>
                                    <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Это действие завершит текущую сессию и скроет аккаунт из системы. Продолжайте только если уверены.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeletingAccount}>Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                        variant="destructive"
                                        disabled={isDeletingAccount}
                                        onClick={(event) => {
                                            event.preventDefault()
                                            void handleAccountDelete()
                                        }}
                                    >
                                        {isDeletingAccount ? "Удаляем..." : "Да, удалить"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            </aside>
        </div>
    )
}

function PrivacyToggle({
    title,
    description,
    checked,
    onCheckedChange,
}: {
    title: string
    description: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
}) {
    return (
        <div className="flex items-start justify-between gap-4 border bg-background/40 p-3">
            <div className="space-y-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    )
}
