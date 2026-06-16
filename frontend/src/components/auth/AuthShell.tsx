import type React from "react"
import { BrainCircuit, CheckCircle2, MessageSquareText, Play, ShieldCheck, Sparkles } from "lucide-react"

import Aurora from "@/components/animations/Aurora"
import { BlurText } from "@/components/animations/BlurText"
import { SiteBrand } from "@/components/layout/site-brand"

const benefits = [
    {
        icon: MessageSquareText,
        title: "Вопросы и публикации",
        text: "Собирайте полезные решения, делитесь материалами и находите ответы быстрее.",
    },
    {
        icon: BrainCircuit,
        title: "AI/RAG-помощник",
        text: "Получайте подсказки по базе знаний платформы, коду, вопросам и черновикам ответов.",
    },
    {
        icon: Play,
        title: "Playground для кода",
        text: "Запускайте фрагменты кода в изолированной среде и сохраняйте сниппеты.",
    },
]

const stats = ["Публикации", "Q&A", "Чаты", "AI", "Код"]

export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="dark relative min-h-svh overflow-hidden bg-[#020806] text-foreground">
            <div className="pointer-events-none absolute inset-x-0 top-[-18%] z-0 h-[72svh] opacity-90 md:h-[88svh]">
                <Aurora
                    colorStops={["#19d78c", "#6d5cff", "#b497cf"]}
                    blend={1}
                    amplitude={1.12}
                    speed={1.5}
                />
            </div>
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_16%_14%,rgba(25,215,140,0.25),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(109,92,255,0.22),transparent_34%),linear-gradient(to_bottom,rgba(2,8,6,0.08),rgba(2,8,6,0.88)_58%,#020806)]" />
            <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />

            <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-7xl items-center gap-9 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,456px)] lg:gap-16 lg:px-8 lg:py-12">
                <section className="mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left">
                    <div className="inline-flex items-center gap-2 !rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-300 backdrop-blur-xl">
                        <Sparkles className="size-4 text-primary" />
                        Auth flow · Вектор
                    </div>

                    <div className="mt-7 flex justify-center lg:justify-start">
                        <SiteBrand size="lg" nameClassName="text-white" />
                    </div>

                    <h1 className="mt-7 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        <BlurText text="Вход в пространство, где код становится знаниями" />
                    </h1>

                    <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-slate-300 sm:text-lg lg:mx-0">
                        Одна платформа для публикаций, вопросов, общения, AI-помощи и безопасного запуска кода.
                    </p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        {benefits.map((benefit) => {
                            const Icon = benefit.icon

                            return (
                                <article
                                    key={benefit.title}
                                    className="border border-white/10 bg-[#06110d]/72 p-4 text-left shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-primary/40 hover:bg-[#0a1812]/80"
                                >
                                    <div className="mb-4 flex size-11 items-center justify-center !rounded-2xl border border-white/10 bg-primary/10 text-primary">
                                        <Icon className="size-5" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-white">{benefit.title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">{benefit.text}</p>
                                </article>
                            )
                        })}
                    </div>

                    <div className="mt-7 flex flex-wrap justify-center gap-2 lg:justify-start">
                        {stats.map((item) => (
                            <span
                                key={item}
                                className="inline-flex items-center gap-2 !rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
                            >
                                <CheckCircle2 className="size-3.5 text-primary" />
                                {item}
                            </span>
                        ))}
                    </div>

                    <div className="mt-7 flex items-center justify-center gap-3 text-sm text-slate-400 lg:justify-start">
                        <ShieldCheck className="size-4 text-primary" />
                        JWT, email verification и OAuth остаются в текущей логике проекта.
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[456px]">{children}</section>
            </div>
        </main>
    )
}
