import type { ReactNode } from "react"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AuthCardProps = {
    eyebrow?: string
    title: string
    description?: ReactNode
    icon?: ReactNode
    children: ReactNode
    footer?: ReactNode
    className?: string
}

export const authCardClassName =
    "w-full !rounded-[2rem] border border-white/10 bg-[#06110d]/86 text-slate-100 shadow-2xl shadow-black/45 backdrop-blur-2xl ring-1 ring-white/10 [&_input]:h-11 [&_input]:!rounded-2xl [&_input]:border-white/10 [&_input]:bg-white/[0.045] [&_input]:text-white [&_input]:placeholder:text-slate-500 [&_input]:focus-visible:border-primary/70 [&_input]:focus-visible:ring-primary/25"

export function AuthCard({
    eyebrow,
    title,
    description,
    icon,
    children,
    footer,
    className,
}: AuthCardProps) {
    return (
        <Card className={cn(authCardClassName, className)}>
            <CardHeader className="gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        {eyebrow && (
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
                                {eyebrow}
                            </p>
                        )}
                        <CardTitle className="font-sans text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                            {title}
                        </CardTitle>
                    </div>

                    {icon && (
                        <div className="flex size-12 shrink-0 items-center justify-center !rounded-2xl border border-white/10 bg-white/[0.045] text-primary shadow-lg shadow-primary/10">
                            {icon}
                        </div>
                    )}
                </div>

                {description && (
                    <CardDescription className="max-w-sm text-sm leading-6 text-slate-400">
                        {description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="px-6 sm:px-8">{children}</CardContent>

            {footer && (
                <CardFooter className="flex-col items-stretch gap-4 px-6 pb-6 sm:px-8 sm:pb-8">
                    {footer}
                </CardFooter>
            )}
        </Card>
    )
}
