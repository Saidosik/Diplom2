"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Database, FileText, Flag, Home, LayoutDashboard, MessageSquare, ScrollText, ShieldCheck, Tags, Users } from "lucide-react"
import type { User } from "@/features/auth/types"
import { SiteBrand } from "@/components/layout/site-brand"
import { AppAmbient } from "@/components/layout/app-ambient"
import { SidebarUser } from "@/components/layout/sidebar-user"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar"

const mainItems = [
    { title: "Обзор", href: "/admin", icon: LayoutDashboard },
    { title: "Жалобы", href: "/admin/reports", icon: Flag },
    { title: "Пользователи", href: "/admin/users", icon: Users },
    { title: "Контент", href: "/admin/content", icon: FileText },
    { title: "Теги", href: "/admin/tags", icon: Tags },
    { title: "Чаты", href: "/admin/chats", icon: MessageSquare },
    { title: "AI индекс", href: "/admin/ai", icon: Database },
    { title: "Рекомендации", href: "/admin/recommendations", icon: BarChart3 },
    { title: "Правовые документы", href: "/admin/legal/privacy-policy", icon: ScrollText, adminOnly: true },
    { title: "Внешний вид", href: "/admin/appearance", icon: Palette, adminOnly: true },
]

const systemItems = [
    { title: "Логи", href: "/admin/logs", icon: ScrollText },
]

type AdminShellProps = {
    user: User
    children: React.ReactNode
}

function isAdmin(user: User) {
    return user.meta?.canManageSystem === true || user.meta?.isAdmin === true || user.role === "admin"
}

function roleLabel(user: User) {
    if (isAdmin(user)) return "Администратор"
    if (user.role === "moderator" || user.meta?.isModerator) return "Модератор"
    return "Сотрудник"
}

function AdminNavLink({ item }: { item: { title: string; href: string; icon: React.ElementType; adminOnly?: boolean } }) {
    const pathname = usePathname()
    const { setOpenMobile } = useSidebar()
    const Icon = item.icon
    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="h-10">
                <Link href={item.href} onClick={() => setOpenMobile(false)}>
                    <Icon />
                    <span className="truncate">{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

function AdminSidebar({ user, canManageSystem }: { user: User; canManageSystem: boolean }) {
    const { setOpenMobile } = useSidebar()

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <div className="flex h-full min-w-0 items-center gap-2">
                    <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                size="lg"
                                tooltip="Админ-панель"
                                className="h-11 px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Link href="/admin" className="gap-3" onClick={() => setOpenMobile(false)}>
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                        <ShieldCheck className="size-4" />
                                    </span>
                                    <span className="grid min-w-0 flex-1 text-left leading-tight">
                                        <span className="truncate font-semibold">Админ-панель</span>
                                        <span className="truncate text-xs text-sidebar-foreground/70">Вектор</span>
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    <SidebarTrigger className="ml-auto size-9 shrink-0 group-data-[collapsible=icon]:mx-auto" />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Управление</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainItems
                                .filter((item) => !item.adminOnly || canManageSystem)
                                .map((item) => <AdminNavLink key={item.href} item={item} />)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {canManageSystem ? (
                    <SidebarGroup>
                        <SidebarGroupLabel>Система</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {systemItems.map((item) => <AdminNavLink key={item.href} item={item} />)}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ) : null}
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter>
                <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
                    <Badge variant={canManageSystem ? "default" : "secondary"} className="max-w-full truncate">{roleLabel(user)}</Badge>
                </div>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="На сайт" className="h-10">
                            <Link href="/" onClick={() => setOpenMobile(false)}>
                                <Home />
                                <span>На сайт</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarUser user={user} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}

export function AdminShell({ user, children }: AdminShellProps) {
    const canManageSystem = isAdmin(user)

    return (
        <SidebarProvider>
            <AdminSidebar user={user} canManageSystem={canManageSystem} />
            <SidebarInset className="min-w-0 flex-1">
                <div className="relative min-h-dvh overflow-hidden bg-background">
                    <AppAmbient scope="admin" />
                    <div className="relative z-10 flex min-h-dvh flex-col">
                        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur sm:px-4 md:px-6">
                            <SidebarTrigger className="size-9" />
                            <Separator orientation="vertical" className="hidden h-5 sm:block" />
                            <SiteBrand href="/admin" size="sm" nameClassName="hidden text-sm sm:inline" />
                            <div className="ml-auto flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                <span className="hidden max-w-48 truncate md:inline">{user.name}</span>
                                <Badge variant={canManageSystem ? "default" : "secondary"} className="shrink-0">{roleLabel(user)}</Badge>
                            </div>
                        </header>

                        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-5 sm:px-4 md:px-6 md:py-6 xl:px-8">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
