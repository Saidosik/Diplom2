export type PlaygroundLanguage = {
    value: string
    label: string
    monaco?: string
}

export type CodeSnippet = {
    id: number
    title: string
    language: string
    code: string
    stdin?: string | null
    visibility: "private" | "public"
    snippet_type?: "snippet" | "template" | "solution" | "note" | string
    status: "draft" | "active" | "archived"
    last_run_status?: string | null
    last_run_at?: string | null
    created_at?: string | null
    updated_at?: string | null
}

export type CodeRun = {
    id: number
    snippet_id?: number | null
    language: string
    code: string
    stdin?: string | null
    status: string
    stdout?: string | null
    stderr?: string | null
    exit_code?: number | null
    message?: string | null
    execution_time: number
    memory_usage: number
    created_at?: string | null
    started_at?: string | null
    finished_at?: string | null
    snippet?: CodeSnippet | null
}

export type RunCodePayload = {
    language: string
    code: string
    stdin?: string
    save?: boolean
    title?: string
    visibility?: "private" | "public"
    snippet_type?: "snippet" | "template" | "solution" | "note"
    snippet_status?: "draft" | "active"
    snippet_id?: number
}

export type SaveCodeSnippetPayload = {
    title: string
    language: string
    code: string
    stdin?: string
    visibility: "private" | "public"
    snippet_type?: "snippet" | "template" | "solution" | "note"
    status?: "draft" | "active" | "archived"
}

export type UserFile = {
    id: number
    original_name: string
    extension?: string | null
    mime_type?: string | null
    size?: number | null
    kind?: string | null
    created_at?: string | null
    updated_at?: string | null
}

export type UserFilePreview = {
    id?: number
    content?: string | null
    truncated?: boolean
    mime_type?: string | null
    original_name?: string | null
}

export type CodeTemplate = {
    id: string
    title: string
    language: string
    code: string
    stdin?: string
}
