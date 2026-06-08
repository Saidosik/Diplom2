"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { navigationGroups, type NavigationItem } from "@/config/navigation"
import type { User } from "@/features/auth/types"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

function isActivePath(pathname: string, href: string) {
    if (href === "/") {
        return pathname === "/"
    }

    return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavMain({ user = null }: { user?: User | null }) {
    const pathname = usePathname()

    function canSeeItem(item: NavigationItem) {
        if (item.visibility === "auth" && !user) return false
        if (item.visibility === "guest" && user) return false

        if (!item.roles || item.roles.length === 0) return true

        const role = user?.role ?? "user"
        return item.roles.includes(role as "user" | "admin" | "moderator")
    }

    return (
        <>
            {navigationGroups.map((group) => {
                const visibleItems = group.items.filter(canSeeItem)

                if (visibleItems.length === 0) {
                    return null
                }

                return (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel>{group.title}</SidebarGroupLabel>

                        <SidebarGroupContent>
                            <SidebarMenu>
                                {visibleItems.map((item) => {
                                const Icon = item.icon
                                const isActive = isActivePath(pathname, item.href)

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        {item.disabled ? (
                                            <SidebarMenuButton
                                                disabled
                                                tooltip={item.title}
                                                className="opacity-60"
                                            >
                                                <Icon />
                                                <span>{item.title}</span>
                                            </SidebarMenuButton>
                                        ) : (
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                tooltip={item.title}
                                            >
                                                <Link href={item.href}>
                                                    <Icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        )}

                                        {item.badge && (
                                            <SidebarMenuBadge>
                                                {item.badge}
                                            </SidebarMenuBadge>
                                        )}
                                    </SidebarMenuItem>
                                )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )
            })}
        </>
    )
}