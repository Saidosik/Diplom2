"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordFieldProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
    buttonLabelVisible?: string
    buttonLabelHidden?: string
}

export function PasswordField({
    className,
    buttonLabelVisible = "Скрыть пароль",
    buttonLabelHidden = "Показать пароль",
    ...props
}: PasswordFieldProps) {
    const [isVisible, setIsVisible] = React.useState(false)

    return (
        <div className="relative">
            <Input
                {...props}
                type={isVisible ? "text" : "password"}
                className={cn("pr-11", className)}
            />
            <button
                type="button"
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center !rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
                onClick={() => setIsVisible((value) => !value)}
                aria-label={isVisible ? buttonLabelVisible : buttonLabelHidden}
            >
                {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    )
}
