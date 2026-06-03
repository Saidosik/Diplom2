import type { IssueBlockType, IssueQuestionStatus } from "@/features/issues/types"
import { getIssuePublicationStatusLabel } from "@/features/issues/lib/issue-workflow"

export const issueStatusLabels: Record<IssueQuestionStatus, string> = {
    draft: "Черновик",
    published: "Опубликован",
    hidden: "Скрыт",
    closed: "Закрыт",
}

export const issueBlockTypeLabels: Record<IssueBlockType, string> = {
    heading: "Заголовок",
    paragraph: "Текст",
    markdown: "Markdown",
    code: "Код",
    terminal: "Терминал",
    diff: "Diff",
    file_tree: "Дерево файлов",
    callout: "Callout",
    code_snippet: "Сниппет",
    image: "Изображение",
    quote: "Цитата",
    warning: "Предупреждение",
    divider: "Разделитель",
}

export function getIssueStatusLabel(status: IssueQuestionStatus, fallback?: string) {
    return getIssuePublicationStatusLabel(status, fallback)
}

export function formatIssueDate(value?: string | null) {
    if (!value) return "дата не указана"

    try {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(new Date(value))
    } catch {
        return value
    }
}

export function formatIssueDateTime(value?: string | null) {
    if (!value) return "дата не указана"

    try {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(value))
    } catch {
        return value
    }
}
