"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    Code2,
    LogIn,
    LogOut,
    Menu,
    Search,
    Settings,
    ShieldCheck,
    UserPlus,
    UserRound,
} from "lucide-react"
import { toast } from "sonner"

import type { User } from "@/features/auth/types"
import { navigationGroups, type NavigationItem } from "@/config/navigation"
import { SiteBrand } from "@/components/layout/site-brand"
import { NotificationsBell } from "@/components/layout/notifications-bell"
import { UserAvatar } from "@/features/users/components/user-avatar"
import { getUserRoleLabel } from "@/features/users/lib/user-display"
import { logout } from "@/features/auth/api"
import { safeRequest } from "@/lib/http/api-errors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const visibleHeaderPaths = new Set(["/publications", "/questions", "/assistant", "/playground", "/friends", "/chats", "/files", "/users"])

const headerItems: NavigationItem[] = navigationGroups
    .flatMap((group) => group.items)
    .filter((item) => visibleHeaderPaths.has(item.href))

function isActivePath(pathname: string, href: string) {
    if (href === "/") {
        return pathname === "/"
    }

    return pathname === href || pathname.startsWith(`${href}/`)
}

type AppHeaderProps = {
    user?: User | null
}

export function AppHeader({ user = null }: AppHeaderProps) {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-6">
                    <SiteBrand href="/" size="sm" nameClassName="text-base" />

                    <nav className="hidden h-16 items-stretch gap-0 lg:flex" aria-label="Основная навигация">
                        {headerItems.map((item) => (
                            <HeaderNavItem
                                key={item.href}
                                item={item}
                                isActive={isActivePath(pathname, item.href)}
                            />
                        ))}
                    </nav>
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
                        <div className="hidden items-center gap-2 sm:flex">
                            <Button asChild size="sm" variant="ghost">
                                <Link href="/auth?mode=login">
                                    <LogIn className="size-4" />
                                    Войти
                                </Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/auth?mode=register">
                                    <UserPlus className="size-4" />
                                    Регистрация
                                </Link>
                            </Button>
                        </div>
                    )}

                    <MobileNavigation user={user} pathname={pathname} />
                </div>
            </div>
        </header>
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

function HeaderNavItem({
    item,
    isActive,
}: {
    item: NavigationItem
    isActive: boolean
}) {
    const Icon = item.icon

    if (item.disabled) {
        return (
            <span className="inline-flex h-16 cursor-not-allowed items-center gap-2 border-x border-transparent px-4 text-sm text-muted-foreground/55">
                <Icon className="size-4" />
                {item.title}
                {item.badge ? (
                    <span className="border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        {item.badge}
                    </span>
                ) : null}
            </span>
        )
    }

    return (
        <Link
            href={item.href}
            className={cn(
                "inline-flex h-16 items-center gap-2 border-x border-transparent px-4 text-sm transition-colors hover:bg-muted/70 hover:text-foreground",
                isActive
                    ? "border-primary/20 border-b-primary bg-primary/10 text-primary"
                    : "text-muted-foreground"
            )}
        >
            <Icon className="size-4" />
            {item.title}
        </Link>
    )
}

function HeaderUserMenu({ user }: { user: User }) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)

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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden h-16 w-14 border-x border-transparent transition-colors hover:bg-muted/70 hover:text-foreground sm:inline-flex"
                    aria-label="Открыть меню профиля"
                >
                    <UserAvatar user={user} className="size-9" />
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
                    <Link href="/profile">
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

function MobileNavigation({
    user,
    pathname,
}: {
    user: User | null
    pathname: string
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="lg:hidden"
                    aria-label="Открыть меню"
                >
                    <Menu className="size-4" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="flex items-center gap-2 text-foreground">
                    <Code2 className="size-4 text-primary" />
                    Навигация
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel>Разделы</DropdownMenuLabel>
                {headerItems.map((item) => {
                    const Icon = item.icon
                    const isActive = isActivePath(pathname, item.href)

                    return (
                        <DropdownMenuItem key={item.href} asChild>
                            <Link
                                href={item.href}
                                className={cn(isActive && "bg-primary/10 text-primary")}
                            >
                                <Icon />
                                {item.title}
                            </Link>
                        </DropdownMenuItem>
                    )
                })}
                <DropdownMenuSeparator />

                {!user ? (
                    <>
                        <DropdownMenuItem asChild>
                            <Link href="/auth?mode=login">
                                <LogIn />
                                Войти
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/auth?mode=register">
                                <UserPlus />
                                Регистрация
                            </Link>
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
