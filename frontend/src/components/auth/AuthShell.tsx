import type React from "react"
import { CheckCircle2 } from "lucide-react"

import Aurora from "@/components/animations/Aurora"
import { SiteBrand } from "@/components/layout/site-brand"

const benefits = [
    "Задавайте вопросы и находите решения",
    "Публикуйте материалы и сохраняйте полезное",
    "Общайтесь в чатах и обменивайтесь опытом",
    "Используйте ИИ-помощника и песочницу кода",
]

export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="relative min-h-svh overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[58svh] opacity-45 blur-[0.5px] md:h-[72svh]">
                <Aurora
                    colorStops={["#016630", "#B497CF", "#5227FF"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={1}
                />
            </div>
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_10%,rgba(1,102,48,0.10),transparent_30%),linear-gradient(to_bottom,transparent,rgba(255,255,255,0.78)_58%,rgba(255,255,255,0.92))]" />

            <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-14 lg:py-12">
                <section className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
                    <div className="mb-8 flex justify-center lg:justify-start">
                        <SiteBrand size="lg" />
                    </div>
                    <div className="rounded-3xl border border-primary/10 bg-white/60 p-6 shadow-sm backdrop-blur-md sm:p-8 lg:bg-white/45">
                        <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Вектор</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            Пространство для знаний, практики и общения
                        </h1>
                        <ul className="mt-6 space-y-3 text-left text-sm text-muted-foreground sm:text-base">
                            {benefits.map((benefit) => (
                                <li key={benefit} className="flex gap-3">
                                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                                    <span>{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[440px]">{children}</section>
            </div>
        </main>
    )
}
