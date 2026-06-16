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
    "w-full !rounded-[1.5rem] border border-white/10 bg-[#06110d]/86 text-slate-100 shadow-2xl shadow-black/45 backdrop-blur-2xl ring-1 ring-white/10 [&_input]:h-10 [&_input]:!rounded-xl [&_input]:border-white/10 [&_input]:bg-white/[0.045] [&_input]:text-white [&_input]:placeholder:text-slate-500 [&_input]:focus-visible:border-primary/70 [&_input]:focus-visible:ring-primary/25"

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
            <CardHeader className="gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        {eyebrow && (
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
                                {eyebrow}
                            </p>
                        )}
                        <CardTitle className="font-sans text-2xl font-semibold tracking-tight text-white">
                            {title}
                        </CardTitle>
                    </div>

                    {icon && (
                        <div className="flex size-10 shrink-0 items-center justify-center !rounded-xl border border-white/10 bg-white/[0.045] text-primary shadow-lg shadow-primary/10">
                            {icon}
                        </div>
                    )}
                </div>

                {description && (
                    <CardDescription className="max-w-sm text-sm leading-5 text-slate-400">
                        {description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="px-5 sm:px-6">{children}</CardContent>

            {footer && (
                <CardFooter className="flex-col items-stretch gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
                    {footer}
                </CardFooter>
            )}
        </Card>
    )
}
