"use client"

import { useEffect, useState } from "react"
import { LoaderCircle, Save } from "lucide-react"
import { toast } from "sonner"

import { AdminPageHeader } from "@/features/admin/components/admin-shared"
import { getAdminLegalPage, updateAdminLegalPage, type LegalPage } from "@/features/legal/api"
import { safeRequest } from "@/lib/http/api-errors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const SLUG = "privacy-policy"

export function AdminPrivacyPolicyPage() {
    const [page, setPage] = useState<LegalPage | null>(null)
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [isPublished, setIsPublished] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        const loadPage = async () => {
            setIsLoading(true)
            const result = await safeRequest(getAdminLegalPage(SLUG))

            if (result.success) {
                setPage(result.data)
                setTitle(result.data.title)
                setContent(result.data.content)
                setIsPublished(result.data.is_published ?? true)
                setError("")
            } else {
                setError("Не удалось загрузить политику конфиденциальности")
                toast.error("Не удалось загрузить политику конфиденциальности")
            }

            setIsLoading(false)
        }

        loadPage()
    }, [])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSaving(true)

        const result = await safeRequest(updateAdminLegalPage(SLUG, {
            title,
            content,
            is_published: isPublished,
        }))

        setIsSaving(false)

        if (!result.success) {
            toast.error(result.error.message || "Не удалось сохранить изменения")
            return
        }

        setPage(result.data)
        setTitle(result.data.title)
        setContent(result.data.content)
        setIsPublished(result.data.is_published ?? true)
        toast.success("Политика конфиденциальности обновлена")
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Политика конфиденциальности данных"
                description="Редактируйте публичный текст, который пользователь принимает при регистрации."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Текст политики</CardTitle>
                    <CardDescription>
                        {page?.updated_at ? `Последнее обновление: ${new Date(page.updated_at).toLocaleString("ru-RU")}` : "Заполните заголовок и текст политики."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
                            <LoaderCircle className="size-5 animate-spin" />
                            Загружаем политику конфиденциальности...
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            {error}
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="privacy-title">Заголовок</Label>
                                <Input
                                    id="privacy-title"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    maxLength={255}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="privacy-content">Текст политики</Label>
                                <Textarea
                                    id="privacy-content"
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    rows={16}
                                    required
                                    className="min-h-72 resize-y leading-6"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                                <div className="space-y-1">
                                    <Label htmlFor="privacy-published">Опубликована</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Неопубликованная политика будет недоступна гостям.
                                    </p>
                                </div>
                                <Switch
                                    id="privacy-published"
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
                            </div>

                            <Button type="submit" disabled={isSaving || title.trim().length === 0 || content.trim().length === 0}>
                                {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Сохранить
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
