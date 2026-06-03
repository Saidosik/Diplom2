import { AlertTriangle, CheckCircle2, CircleDot, Clock3, HelpCircle, Lock, MessageSquare, ShieldAlert, type LucideIcon } from "lucide-react"

import type { IssueQuestion, IssueQuestionStatus } from "@/features/issues/types"

export type IssueWorkflowStatus = NonNullable<IssueQuestion["workflow_status"]>

export type IssueWorkflowMeta = {
    status: IssueWorkflowStatus
    label: string
    description: string
    tone: "default" | "secondary" | "outline" | "destructive"
    className: string
    icon: LucideIcon
}

export const issueWorkflowMeta: Record<IssueWorkflowStatus, IssueWorkflowMeta> = {
    open: {
        status: "open",
        label: "Открыт",
        description: "Вопрос опубликован и ждёт первого ответа от сообщества.",
        tone: "secondary",
        className: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        icon: HelpCircle,
    },
    has_answers: {
        status: "has_answers",
        label: "Есть ответы",
        description: "У вопроса уже есть ответы, но автор ещё не выбрал решение.",
        tone: "outline",
        className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        icon: MessageSquare,
    },
    solved: {
        status: "solved",
        label: "Решён",
        description: "Автор отметил один из ответов как правильное решение.",
        tone: "default",
        className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: CheckCircle2,
    },
    closed: {
        status: "closed",
        label: "Закрыт",
        description: "Вопрос закрыт: новые ответы недоступны или обсуждение завершено.",
        tone: "secondary",
        className: "border-muted bg-muted text-muted-foreground",
        icon: Lock,
    },
    moderation: {
        status: "moderation",
        label: "На модерации",
        description: "Материал скрыт или ожидает проверки модератором.",
        tone: "destructive",
        className: "border-destructive/25 bg-destructive/10 text-destructive",
        icon: ShieldAlert,
    },
}

export function getQuestionWorkflowStatus(question: IssueQuestion): IssueWorkflowStatus {
    if (question.workflow_status) {
        return question.workflow_status
    }

    if (question.status === "hidden") {
        return "moderation"
    }

    if (question.status === "closed") {
        return "closed"
    }

    if (question.is_solved || question.accepted_answer_id) {
        return "solved"
    }

    const answersCount = question.answers_count ?? question.answers?.length ?? 0

    if (answersCount > 0) {
        return "has_answers"
    }

    return "open"
}

export function getQuestionWorkflowMeta(question: IssueQuestion): IssueWorkflowMeta {
    const status = getQuestionWorkflowStatus(question)
    const meta = issueWorkflowMeta[status]

    return {
        ...meta,
        label: question.workflow_status_label || meta.label,
    }
}

export function getIssuePublicationStatusLabel(status: IssueQuestionStatus, fallback?: string) {
    const labels: Record<IssueQuestionStatus, string> = {
        draft: "Черновик",
        published: "Опубликован",
        hidden: "Скрыт",
        closed: "Закрыт",
    }

    return labels[status] || fallback || status
}

export function getQuestionPopularityScore(question: IssueQuestion) {
    const answers = question.answers_count ?? question.answers?.length ?? 0
    const likes = question.likes_count || 0
    const dislikes = question.dislikes_count || 0
    const views = question.views_count || 0

    return answers * 4 + likes * 3 + Math.floor(views / 10) - dislikes
}

export function getQuestionWorkflowSteps(question: IssueQuestion) {
    const current = getQuestionWorkflowStatus(question)
    const statuses: IssueWorkflowStatus[] = ["open", "has_answers", "solved"]
    const currentIndex = statuses.includes(current) ? statuses.indexOf(current) : -1

    return statuses.map((status, index) => {
        const meta = issueWorkflowMeta[status]
        return {
            ...meta,
            isDone: current === "solved" ? true : currentIndex >= index,
            isCurrent: current === status,
        }
    })
}

export function getQuestionQualityHints(question: IssueQuestion) {
    const hints: Array<{ title: string; description: string; icon: LucideIcon }> = []
    const answersCount = question.answers_count ?? question.answers?.length ?? 0

    if (answersCount === 0) {
        hints.push({
            title: "Нужен первый ответ",
            description: "Вопрос можно продвинуть в ленте: добавь больше деталей, код ошибки или уточнение.",
            icon: Clock3,
        })
    }

    if (!question.tags?.length) {
        hints.push({
            title: "Нет тегов",
            description: "Теги помогают системе рекомендовать вопрос подходящим участникам.",
            icon: AlertTriangle,
        })
    }

    if (question.excerpt && question.excerpt.length < 80) {
        hints.push({
            title: "Описание короткое",
            description: "Чем точнее описание проблемы, тем выше шанс получить полезный ответ.",
            icon: CircleDot,
        })
    }

    return hints
}
