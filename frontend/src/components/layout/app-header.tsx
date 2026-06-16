"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    LogIn,
    LogOut,
    Search,
    Settings,
    ShieldCheck,
    UserPlus,
    UserRound,
} from "lucide-react"
import { toast } from "sonner"

import type { User } from "@/features/auth/types"
import { SiteBrand } from "@/components/layout/site-brand"
import { NotificationsBell } from "@/components/layout/notifications-bell"
import { UserAvatar } from "@/features/users/components/user-avatar"
import { getUserRoleLabel } from "@/features/users/lib/user-display"
import { getUserProfileHrefOrFallback } from "@/features/users/lib/user-links"
import { logout } from "@/features/auth/api"
import { notifySessionChanged } from "@/lib/auth/session-events"
import { safeRequest } from "@/lib/http/api-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AppHeaderProps = {
    user?: User | null
}

export function AppHeader({ user = null }: AppHeaderProps) {
    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <SidebarTrigger className="md:hidden" />
                    <SiteBrand href="/" size="sm" nameClassName="hidden text-base sm:inline" />
                </div>

                <div className="flex flex-1 items-center justify-end gap-2">
                    <HeaderSearchForm />

                    <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        className="md:hidden"
                        aria-label="Поиск по платформе"
                    >
                        <Link href="/search">
                            <Search className="size-4" />
                        </Link>
                    </Button>

                    {user ? <NotificationsBell /> : null}

                    {user ? (
                        <HeaderUserMenu user={user} />
                    ) : (
                        <GuestActions />
                    )}
                </div>
            </div>
        </header>
    )
}

function GuestActions() {
    return (
        <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild size="sm" variant="ghost">
                <Link href="/auth?mode=login">
                    <LogIn className="size-4" />
                    <span className="hidden sm:inline">Войти</span>
                </Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/auth?mode=register">
                    <UserPlus className="size-4" />
                    Регистрация
                </Link>
            </Button>
        </div>
    )
}

function HeaderSearchForm() {
    const router = useRouter()
    const [query, setQuery] = React.useState("")

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const value = query.trim()

        if (value.length < 2) {
            router.push("/search")
            return
        }

        router.push(`/search?q=${encodeURIComponent(value)}`)
    }

    return (
        <form onSubmit={handleSubmit} className="hidden w-full max-w-md items-center gap-2 md:flex">
            <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Поиск по платформе"
                    className="h-10 rounded-xl bg-muted/50 pl-9"
                    aria-label="Поиск по платформе"
                />
            </div>
        </form>
    )
}

function HeaderUserMenu({ user }: { user: User }) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)
    const profileHref = getUserProfileHrefOrFallback(user)

    async function handleLogout() {
        try {
            setIsLoggingOut(true)

            const result = await safeRequest(logout())

            if (!result.success) {
                throw new Error("Logout failed")
            }

            toast.success("Вы вышли из аккаунта")
            notifySessionChanged()
            router.refresh()
            router.push("/auth?mode=login")
            router.refresh()
        } catch (error) {
            console.log("[LOGOUT_ERROR]", error)
            toast.error("Не удалось выйти из аккаунта")
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl border border-transparent transition-colors hover:border-primary/20 hover:bg-primary/10 hover:text-foreground"
                    aria-label="Открыть меню профиля"
                >
                    <UserAvatar user={user} className="size-8" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                    <div className="flex items-center gap-3">
                        <UserAvatar user={user} className="size-10" size="lg" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                                {user.name}
                            </p>
                            <p className="truncate text-xs">{user.email}</p>
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span>Роль</span>
                        <span className="font-medium text-foreground">
                            {getUserRoleLabel(user.role)}
                        </span>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href={profileHref}>
                        <UserRound />
                        Профиль
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href="/settings">
                        <Settings />
                        Настройки
                    </Link>
                </DropdownMenuItem>

                {(user.meta?.isStaff || user.meta?.isAdmin || user.role === "admin" || user.role === "moderator") ? (
                    <DropdownMenuItem asChild>
                        <Link href="/admin">
                            <ShieldCheck />
                            Админ-панель
                        </Link>
                    </DropdownMenuItem>
                ) : null}

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
    )
}
