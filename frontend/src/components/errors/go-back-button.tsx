"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function GoBackButton() {
    const router = useRouter()

    return (
        <Button type="button" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
            Назад
        </Button>
    )
}
