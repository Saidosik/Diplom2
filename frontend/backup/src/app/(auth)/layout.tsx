import { SiteBrand } from "@/components/layout/site-brand"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <main className="min-h-svh bg-background">
            <div className="mx-auto flex min-h-svh w-full max-w-screen-xl items-center justify-center px-4 py-10">
                <div className="w-full max-w-md space-y-6">
                    <div className="flex justify-center">
                        <SiteBrand size="lg" />
                    </div>

                    {children}
                </div>
            </div>
        </main>
    )
}
