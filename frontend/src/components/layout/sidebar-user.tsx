"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ChevronsUpDown,
    LogIn,
    LogOut,
    Settings,
    ShieldCheck,
    UserPlus,
    UserRound,
} from "lucide-react"
import { toast } from "sonner"

import type { User } from "@/features/auth/types"
import { UserAvatar } from "@/features/users/components/user-avatar"
import {
    getUserRoleLabel,
} from "@/features/users/lib/user-display"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { logout } from "@/features/auth/api"
import { safeRequest } from "@/lib/http/api-errors"

type SidebarUserProps = {
    user: User | null
}

export function SidebarUser({ user }: SidebarUserProps) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)
    const { isMobile, setOpenMobile } = useSidebar()

    function closeMobileSidebar() {
        if (isMobile) {
            setOpenMobile(false)
        }
    }

    async function handleLogout() {
        try {
            setIsLoggingOut(true)

            const result = await safeRequest(logout())

            if (!result.success) {
                throw new Error("Logout failed")
            }

            toast.success("Вы вышли из аккаунта")
            router.push("/auth?mode=login")
            router.refresh()
        } catch (error) {
            console.log("[LOGOUT_ERROR]", error)
            toast.error("Не удалось выйти из аккаунта")
        } finally {
            setIsLoggingOut(false)
        }
    }

    if (!user) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="lg" tooltip="Войти">
                        <Link href="/auth?mode=login" onClick={closeMobileSidebar}>
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                <LogIn className="size-4" />
                            </div>
                            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-medium">Войти в аккаунт</span>
                                <span className="truncate text-xs text-sidebar-foreground/60">для комментариев и сохранений</span>
                            </div>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuButton asChild>
                        <Link href="/auth?mode=register" onClick={closeMobileSidebar}>
                            <UserPlus />
                            <span>Создать профиль</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            tooltip={user.name}
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <UserAvatar
                                user={user}
                                className="size-8"
                            />

                            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-medium">
                                    {user.name}
                                </span>
                                <span className="truncate text-xs text-sidebar-foreground/60">
                                    {user.email}
                                </span>
                            </div>

                            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        side="right"
                        align="end"
                        sideOffset={8}
                        className="w-72"
                    >
                        <DropdownMenuLabel>
                            <div className="flex items-center gap-3">
                                <UserAvatar
                                    user={user}
                                    className="size-10"
                                    size="lg"
                                />

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {user.name}
                                    </p>
                                    <p className="truncate text-xs">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                    <span>Роль</span>
                                    <span className="font-medium text-foreground">
                                        {getUserRoleLabel(user.role)}
                                    </span>
                                </div>

                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <Link href="/profile" onClick={closeMobileSidebar}>
                                <UserRound />
                                Профиль
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <Link href="/settings" onClick={closeMobileSidebar}>
                                <Settings />
                                Настройки
                            </Link>
                        </DropdownMenuItem>

                        {(user.meta?.isStaff || user.meta?.isAdmin || user.role === "admin" || user.role === "moderator") && (
                            <DropdownMenuItem asChild>
                                <Link href="/admin" onClick={closeMobileSidebar}>
                                    <ShieldCheck />
                                    Админ-панель
                                </Link>
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            variant="destructive"
                            disabled={isLoggingOut}
                            onSelect={(event) => {
                                event.preventDefault()
                                void handleLogout()
                            }}
                        >
                            <LogOut />
                            {isLoggingOut ? "Выходим..." : "Выйти"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
