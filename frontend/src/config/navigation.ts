import type { LucideIcon } from "lucide-react"
import {
    Bell,
    Bot,
    CircleHelp,
    Code2,
    Flame,
    FolderOpen,
    Home,
    MessageCircle,
    Newspaper,
    Search,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Tags,
    User,
    UserRoundPlus,
    Users,
} from "lucide-react"

export type NavigationItem = {
    title: string
    href: string
    icon: LucideIcon
    badge?: string
    disabled?: boolean
    roles?: Array<"user" | "admin" | "moderator">
}

export type NavigationGroup = {
    title: string
    items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
    {
        title: "Главное",
        items: [
            { title: "Лента", href: "/", icon: Home },
            { title: "Поиск", href: "/search", icon: Search },
            { title: "AI-помощник", href: "/assistant", icon: Bot },
            { title: "Рекомендации", href: "/recommendations", icon: Sparkles },
            { title: "Интересы", href: "/interests", icon: SlidersHorizontal },
            { title: "Тренды", href: "/trends", icon: Flame },
            { title: "Профиль", href: "/profile", icon: User },
            { title: "Уведомления", href: "/inbox", icon: Bell },
            { title: "Файлы", href: "/files", icon: FolderOpen },
        ],
    },
    {
        title: "Сообщество",
        items: [
            { title: "Публикации", href: "/publications", icon: Newspaper },
            { title: "Вопросы", href: "/questions", icon: CircleHelp },
            { title: "Теги", href: "/tags", icon: Tags },
            { title: "Участники", href: "/users", icon: Users },
            { title: "Друзья", href: "/friends", icon: UserRoundPlus },
            { title: "Чаты", href: "/chats", icon: MessageCircle },
        ],
    },
    {
        title: "Инструменты",
        items: [
            { title: "Песочница", href: "/playground", icon: Code2 },
            { title: "Админка", href: "/admin", icon: ShieldCheck, roles: ["admin", "moderator"] },
            { title: "Настройки", href: "/settings", icon: Settings },
        ],
    },
]

export function getNavigationItemByPathname(pathname: string) {
    return navigationGroups
        .flatMap((group) => group.items)
        .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
}
