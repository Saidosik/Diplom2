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
    SidebarTrigger,
} from "@/components/ui/sidebar"


type AppSidebarProps = {
    user: User | null
}

export function AppSidebar({ user }: AppSidebarProps) {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2">
                        <SidebarMenuButton
                            asChild
                            size="lg"
                            tooltip="Вектор"
                            className="min-w-0 flex-1 justify-start px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:flex-none"
                        >
                            <SiteBrand href="/" size="sm" className="min-w-0 gap-3" nameClassName="text-sm" />
                        </SidebarMenuButton>

                        <SidebarTrigger className="ml-auto size-9 shrink-0 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain user={user} />
            </SidebarContent>

            <SidebarFooter>
                <SidebarUser user={user} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
