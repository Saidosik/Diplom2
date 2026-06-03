"use client"

import Editor, { type OnMount } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type MonacoCodeEditorProps = {
    value: string
    onChange: (value: string) => void
    language?: string
    height?: number | string
    readOnly?: boolean
    className?: string
}

const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    fontLigatures: true,
    fontFamily: "var(--font-mono), JetBrains Mono, monospace",
    lineHeight: 22,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: "on" as const,
    padding: { top: 14, bottom: 14 },
    roundedSelection: true,
    renderLineHighlight: "line" as const,
    contextmenu: true,
}

export function MonacoCodeEditor({
    value,
    onChange,
    language = "javascript",
    height = 420,
    readOnly = false,
    className,
}: MonacoCodeEditorProps) {
    const handleMount: OnMount = (editor) => {
        editor.focus()
    }

    return (
        <div className={cn("overflow-hidden rounded-2xl border bg-background", className)}>
            <Editor
                height={height}
                language={language}
                value={value}
                theme="vs-dark"
                loading={(
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Загружаем редактор кода
                    </div>
                )}
                options={{ ...editorOptions, readOnly }}
                onMount={handleMount}
                onChange={(nextValue) => onChange(nextValue ?? "")}
            />
        </div>
    )
}
