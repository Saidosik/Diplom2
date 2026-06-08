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
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar"


type AppSidebarProps = {
    user: User | null
}

export function AppSidebar({ user }: AppSidebarProps) {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <div className="flex h-full min-w-0 items-center gap-2">
                    <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                size="lg"
                                tooltip="Вектор"
                                className="h-11 px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <SiteBrand href="/" size="sm" className="gap-3" nameClassName="text-sm" />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>

                    <SidebarTrigger className="ml-auto size-9 shrink-0 group-data-[collapsible=icon]:mx-auto" />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <NavMain user={user} />
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter>
                <SidebarUser user={user} />
            </SidebarFooter>
        </Sidebar>
    )
}
