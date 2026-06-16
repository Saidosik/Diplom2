import type React from "react"
import { BrainCircuit, MessageSquareText, Play } from "lucide-react"

import { BlurText } from "@/components/animations/BlurText"
import { SiteBrand } from "@/components/layout/site-brand"
import { BackgroundRenderer } from "@/components/backgrounds/BackgroundRenderer"

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

export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="dark relative min-h-svh overflow-hidden bg-[#020806] text-foreground">
            <BackgroundRenderer scope="auth" className="z-0" />

            <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-7xl items-center gap-9 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,420px)] lg:gap-16 lg:px-8 lg:py-12">
                <section className="mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left">
                    <div className="flex justify-center lg:justify-start">
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
                </section>

                <section className="mx-auto w-full max-w-[420px]">{children}</section>
            </div>
        </main>
    )
}
