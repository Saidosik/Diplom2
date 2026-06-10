
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs"
import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppFooter } from "@/components/layout/app-footer"
import { getCurrentUser, hasVerifiedEmail } from "@/features/auth/server"
import { redirect } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    if (user && !hasVerifiedEmail(user)) {
        redirect(`/verify-email?email=${encodeURIComponent(user.email)}`)
    }

    return (
        <SidebarProvider>
            <AppSidebar user={user} />
            <SidebarInset>
                <div className="min-h-dvh bg-background">
                    <AppHeader user={user} />

                    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
                        <AppBreadcrumbs />
                        {children}
                    </main>
                    <AppFooter />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
