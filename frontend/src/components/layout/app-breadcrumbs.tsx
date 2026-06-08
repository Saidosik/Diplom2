"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home } from "lucide-react"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const segmentLabels: Record<string, string> = {
    publications: "Публикации",
    questions: "Вопросы",
    profile: "Профиль",
    users: "Участники",
    inbox: "Inbox",
    trends: "Тренды",
    recommendations: "Рекомендации",
    settings: "Настройки",
    tags: "Теги",
    playground: "Песочница кода",
    create: "Создание",
    editor: "Редактирование",
    my: "Мои материалы",
    admin: "Админ-панель",
    reports: "Жалобы",
    content: "Контент",
    chats: "Чаты",
    friends: "Друзья",
    files: "Файлы",
    forbidden: "Доступ закрыт",
    assistant: "AI-помощник",
}


function getSegmentLabel(segment: string, previousSegment?: string) {
    if (segmentLabels[segment]) {
        return segmentLabels[segment]
    }

    if (previousSegment === "publications") {
        return "Публикация"
    }

    if (previousSegment === "questions") {
        return "Вопрос"
    }

    if (previousSegment === "users") {
        return "Пользователь"
    }

    if (previousSegment === "editor") {
        return "Материал"
    }

    return decodeURIComponent(segment)
}

export function AppBreadcrumbs() {
    const pathname = usePathname()
    const cleanPath = pathname.split("?")[0]
    const segments = cleanPath.split("/").filter(Boolean)

    if (segments.length === 0) {
        return (
            <Breadcrumb className="text-xs">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbPage className="flex items-center gap-1.5">
                            <Home className="size-3.5" />
                            Главная
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        )
    }

    return (
        <Breadcrumb className="text-xs">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/" className="flex items-center gap-1.5">
                            <Home className="size-3.5" />
                            Главная
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>

                {segments.map((segment, index) => {
                    const href = `/${segments.slice(0, index + 1).join("/")}`
                    const isLast = index === segments.length - 1
                    const label = getSegmentLabel(segment, segments[index - 1])

                    return (
                        <Fragment key={href}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href}>{label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
