"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { CodeSnippet } from "@/features/playground/types"

type CodeSnippetPickerFieldsProps = {
    content: Record<string, unknown>
    snippets: CodeSnippet[]
    onChange: (key: string, value: unknown) => void
}

function getString(value: unknown, fallback = "") {
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    return typeof value === "string" ? value : fallback
}

function getSnippetValue(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "string" && value.trim()) return value
    return "manual"
}

export function CodeSnippetPickerFields({ content, snippets, onChange }: CodeSnippetPickerFieldsProps) {
    function applySnippet(snippet: CodeSnippet) {
        onChange("snippet_id", snippet.id)
        onChange("title", snippet.title)
        onChange("language", snippet.language)
        onChange("code", snippet.code)
        onChange("stdin", snippet.stdin ?? "")
        onChange("href", `/playground?snippet=${snippet.id}`)
    }

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                    <Label>Сохранённый сниппет</Label>
                    <Select
                        value={getSnippetValue(content.snippet_id)}
                        onValueChange={(value) => {
                            if (value === "manual") {
                                onChange("snippet_id", "")
                                return
                            }

                            const snippet = snippets.find((item) => item.id === Number(value))
                            if (snippet) applySnippet(snippet)
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Выбери сниппет" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Заполнить вручную</SelectItem>
                            {snippets.map((snippet) => (
                                <SelectItem key={snippet.id} value={String(snippet.id)}>
                                    {snippet.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Язык</Label>
                    <Input value={getString(content.language)} onChange={(event) => onChange("language", event.target.value)} placeholder="php, js, python" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                <div className="space-y-2">
                    <Label>Название</Label>
                    <Input value={getString(content.title)} onChange={(event) => onChange("title", event.target.value)} placeholder="Название примера" />
                </div>
                <div className="space-y-2">
                    <Label>ID</Label>
                    <Input value={getString(content.snippet_id)} onChange={(event) => onChange("snippet_id", event.target.value)} placeholder="42" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Код</Label>
                <Textarea value={getString(content.code)} onChange={(event) => onChange("code", event.target.value)} className="min-h-56 font-mono text-sm" spellCheck={false} />
            </div>

            <div className="space-y-2">
                <Label>STDIN</Label>
                <Textarea value={getString(content.stdin)} onChange={(event) => onChange("stdin", event.target.value)} className="min-h-24 font-mono text-sm" spellCheck={false} />
            </div>

            <div className="space-y-2">
                <Label>Комментарий к примеру</Label>
                <Input value={getString(content.note)} onChange={(event) => onChange("note", event.target.value)} placeholder="Почему этот пример важен для материала" />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">snapshot сохраняется в материале</Badge>
                <Badge variant="outline">оригинал открывается в песочнице</Badge>
            </div>
        </div>
    )
}
