"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { navigationGroups } from "@/config/navigation"
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
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavMain({ user = null }: { user?: User | null }) {
    const pathname = usePathname()

    function canSeeItem(roles?: Array<"user" | "admin" | "moderator">) {
        if (!roles || roles.length === 0) return true
        const role = user?.role ?? "user"
        return roles.includes(role as "user" | "admin" | "moderator")
    }

    return (
        <>
            {navigationGroups.map((group) => (
                <SidebarGroup key={group.title}>
                    <SidebarGroupLabel>{group.title}</SidebarGroupLabel>

                    <SidebarGroupContent>
                        <SidebarMenu>
                            {group.items.filter((item) => canSeeItem(item.roles)).map((item) => {
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
            ))}
        </>
    )
}