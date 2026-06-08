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

export type NavigationVisibility = "public" | "auth" | "guest"
export type NavigationGroupKey = "public" | "workspace" | "personal" | "admin" | "guest"

export type NavigationItem = {
    title: string
    href: string
    icon: LucideIcon
    badge?: string
    disabled?: boolean
    roles?: Array<"user" | "admin" | "moderator">
    visibility: NavigationVisibility
    group: NavigationGroupKey
}

export type NavigationGroup = {
    key: NavigationGroupKey
    title: string
    items: NavigationItem[]
}

export const navigationItems: NavigationItem[] = [
    { title: "Лента", href: "/", icon: Home, visibility: "public", group: "public" },
    { title: "Поиск", href: "/search", icon: Search, visibility: "public", group: "public" },
    { title: "Публикации", href: "/publications", icon: Newspaper, visibility: "public", group: "public" },
    { title: "Вопросы", href: "/questions", icon: CircleHelp, visibility: "public", group: "public" },
    { title: "Теги", href: "/tags", icon: Tags, visibility: "public", group: "public" },
    { title: "Участники", href: "/users", icon: Users, visibility: "public", group: "public" },
    { title: "Тренды", href: "/trends", icon: Flame, visibility: "public", group: "public" },
    { title: "Рекомендации", href: "/recommendations", icon: Sparkles, visibility: "public", group: "public" },

    { title: "AI-помощник", href: "/assistant", icon: Bot, visibility: "auth", group: "workspace" },
    { title: "Файлы", href: "/files", icon: FolderOpen, visibility: "auth", group: "workspace" },
    { title: "Песочница", href: "/playground", icon: Code2, visibility: "auth", group: "workspace" },
    { title: "Друзья", href: "/friends", icon: UserRoundPlus, visibility: "auth", group: "workspace" },
    { title: "Чаты", href: "/chats", icon: MessageCircle, visibility: "auth", group: "workspace" },
    { title: "Интересы", href: "/interests", icon: SlidersHorizontal, visibility: "auth", group: "workspace" },

    { title: "Уведомления", href: "/inbox", icon: Bell, visibility: "auth", group: "personal" },
    { title: "Профиль", href: "/profile", icon: User, visibility: "auth", group: "personal" },
    { title: "Настройки", href: "/settings", icon: Settings, visibility: "auth", group: "personal" },

    { title: "Админка", href: "/admin", icon: ShieldCheck, roles: ["admin", "moderator"], visibility: "auth", group: "admin" },
]

const navigationGroupMeta: Array<Pick<NavigationGroup, "key" | "title">> = [
    { key: "public", title: "Публичное" },
    { key: "workspace", title: "Рабочее пространство" },
    { key: "personal", title: "Аккаунт" },
    { key: "admin", title: "Модерация" },
]

export const navigationGroups: NavigationGroup[] = navigationGroupMeta.map((group) => ({
    ...group,
    items: navigationItems.filter((item) => item.group === group.key),
}))

export function getNavigationItemByPathname(pathname: string) {
    return navigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
}
