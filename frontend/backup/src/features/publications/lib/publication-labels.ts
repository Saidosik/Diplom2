import type { PublicationBlockType, PublicationStatus, PublicationType } from "@/features/publications/types"

export const publicationTypeLabels: Record<PublicationType, string> = {
    article: "Статья",
    news: "Новость",
    post: "Пост",
    guide: "Гайд",
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
}

export function formatPublicationDate(value?: string | null) {
    if (!value) {
        return "Дата не указана"
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(value))
}

export function getPublicationTypeLabel(type: PublicationType, fallback?: string) {
    return fallback || publicationTypeLabels[type] || type
}

export function getPublicationStatusLabel(status: PublicationStatus, fallback?: string) {
    return fallback || publicationStatusLabels[status] || status
}
