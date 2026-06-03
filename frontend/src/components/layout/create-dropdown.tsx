"use client"

import Link from "next/link"
import { CircleHelp, FileUp, Newspaper, Plus, Sparkles, SquareTerminal } from "lucide-react"

import type { User } from "@/features/auth/types"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function CreateDropdown({ user }: { user?: User | null }) {
    if (!user) {
        return (
            <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/auth?mode=register">
                    <Plus className="size-4" />
                    Создать профиль
                </Link>
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="sm" className="hidden sm:inline-flex">
                    <Plus className="size-4" />
                    Создать
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Новое действие</p>
                        <p className="text-xs text-muted-foreground">Публикация, вопрос, код или файл</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/publications/create">
                        <Newspaper />
                        Создать публикацию
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/questions/create">
                        <CircleHelp />
                        Задать вопрос
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/playground?new=snippet">
                        <SquareTerminal />
                        Фрагмент кода
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/files">
                        <FileUp />
                        Загрузить файл
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/assistant">
                        <Sparkles />
                        Открыть ИИ-помощник
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
