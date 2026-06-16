import type { PublicationBlockType, PublicationStatus, PublicationType } from "@/features/publications/types"

export const publicationTypeLabels: Record<PublicationType, string> = {
    article: "Статья",
    news: "Новость",
    post: "Пост",
    guide: "Гайд",
    tutorial: "Туториал",
    opinion: "Мнение",
    release: "Релиз",
    question_related: "Q&A материал",
}

export const publicationStatusLabels: Record<PublicationStatus, string> = {
    draft: "Черновик",
    published: "Опубликовано",
    hidden: "Скрыто",
    archived: "В архиве",
}

export const publicationBlockTypeLabels: Record<PublicationBlockType, string> = {
    heading: "Заголовок",
    paragraph: "Текст",
    markdown: "Markdown",
    image: "Изображение",
    video: "Видео",
    code: "Код",
    terminal: "Терминал",
    diff: "Diff",
    file_tree: "Дерево файлов",
    callout: "Callout",
    code_snippet: "Сниппет",
    important: "Важно",
    quote: "Цитата",
    warning: "Предупреждение",
    link: "Ссылка",
    divider: "Разделитель",
    table: "Таблица",
    diagram: "Mermaid/Diagram",
}

export function formatPublicationDate(value?: string | null) {
    if (!value) {
        return "Дата не указана"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return "Дата не указана"
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date)
}

export function getPublicationTypeLabel(type: PublicationType, fallback?: string) {
    return fallback || publicationTypeLabels[type] || type
}

export function getPublicationStatusLabel(status: PublicationStatus, fallback?: string) {
    return fallback || publicationStatusLabels[status] || status
}
