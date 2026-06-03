"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Database, FileText, Flag, Home, LayoutDashboard, MessageSquare, ScrollText, ShieldCheck, Users } from "lucide-react"
import type { User } from "@/features/auth/types"
import { SiteBrand } from "@/components/layout/site-brand"
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
} from "@/components/ui/sidebar"

const mainItems = [
    { title: "Обзор", href: "/admin", icon: LayoutDashboard },
    { title: "Жалобы", href: "/admin/reports", icon: Flag },
    { title: "Пользователи", href: "/admin/users", icon: Users },
    { title: "Контент", href: "/admin/content", icon: FileText },
    { title: "Чаты", href: "/admin/chats", icon: MessageSquare },
    { title: "AI индекс", href: "/admin/ai", icon: Database },
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

export function AdminShell({ user, children }: AdminShellProps) {
    const pathname = usePathname()
    const canManageSystem = isAdmin(user)

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader className="p-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="lg" tooltip="Админ-панель">
                                <Link href="/admin" className="gap-3">
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                        <ShieldCheck className="size-4" />
                                    </span>
                                    <span className="grid flex-1 text-left leading-tight">
                                        <span className="truncate font-semibold">Админ-панель</span>
                                        <span className="truncate text-xs text-sidebar-foreground/70">Вектор</span>
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarSeparator />

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Модерация</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {mainItems.map((item) => {
                                    const Icon = item.icon
                                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                                                <Link href={item.href}>
                                                    <Icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {canManageSystem ? (
                        <SidebarGroup>
                            <SidebarGroupLabel>Система</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {systemItems.map((item) => {
                                        const Icon = item.icon
                                        const isActive = pathname === item.href || pathname.startsWith(item.href)

                                        return (
                                            <SidebarMenuItem key={item.href}>
                                                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                                                    <Link href={item.href}>
                                                        <Icon />
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ) : null}
                </SidebarContent>

                <SidebarSeparator />

                <SidebarFooter className="p-2">
                    <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
                        <Badge variant={canManageSystem ? "default" : "secondary"}>{roleLabel(user)}</Badge>
                    </div>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="На сайт">
                                <Link href="/">
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

            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="h-5" />
                    <SiteBrand href="/admin" size="sm" nameClassName="text-sm" />
                    <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="hidden sm:inline">{user.name}</span>
                        <Badge variant={canManageSystem ? "default" : "secondary"}>{roleLabel(user)}</Badge>
                    </div>
                </header>

                <main className="flex-1 overflow-auto px-4 py-6 md:px-6 xl:px-8">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
