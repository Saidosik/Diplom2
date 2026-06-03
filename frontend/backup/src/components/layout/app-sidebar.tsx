"use client"

import type { User } from "@/features/auth/types"
import { NavMain } from "@/components/layout/nav-main"
import { SidebarUser } from "@/components/layout/sidebar-user"
import { SiteBrand } from "@/components/layout/site-brand"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar"

type AppSidebarProps = {
    user: User | null
}

export function AppSidebar({ user }: AppSidebarProps) {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            size="lg"
                            tooltip="Вектор"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <SiteBrand href="/" size="sm" className="gap-3" nameClassName="text-sm" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent>
                <NavMain user={user} />
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter className="p-2">
                <SidebarUser user={user} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
