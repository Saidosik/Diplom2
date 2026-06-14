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
        <main className="dark relative min-h-svh overflow-hidden bg-[#020806] text-foreground">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[64svh] opacity-60 blur-[0.5px] md:h-[82svh]">
                <Aurora
                    colorStops={["#016630", "#B497CF", "#5227FF"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={1}
                />
            </div>
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_12%,rgba(1,102,48,0.26),transparent_28%),radial-gradient(circle_at_78%_8%,rgba(82,39,255,0.16),transparent_30%),linear-gradient(to_bottom,rgba(2,8,6,0.12),rgba(2,8,6,0.82)_52%,#020806)]" />

            <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-14 lg:py-12">
                <section className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
                    <div className="rounded-3xl border border-white/10 bg-[#07110c] p-6 shadow-2xl shadow-black/30 sm:p-8">
                        <div className="flex justify-center lg:justify-start">
                            <SiteBrand size="lg" />
                        </div>
                        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Пространство для знаний, практики и общения
                        </h1>
                        <ul className="mt-6 space-y-3 text-left text-sm text-slate-300 sm:text-base">
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
