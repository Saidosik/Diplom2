import "server-only"

import { redirect } from "next/navigation"

import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"

import type { User } from "@/features/auth/types"

function normalizeUser(payload: unknown): User {
    const data = payload as {
        data?: User
        user?: User
    }

    return data.data ?? data.user ?? (payload as User)
}

export async function getCurrentUser(): Promise<User | null> {
    const token = await getAccessTokenCookie()

    if (!token) {
        return null
    }

    try {
        const laravel = createLaravelApi(token)

        const response = await laravel.get("/me")

        return normalizeUser(response.data)
    } catch (error) {
        console.log("[GET_CURRENT_USER_ERROR]", error)

        return null
    }
}

export async function requireUser(): Promise<User> {
    const user = await getCurrentUser()

    if (!user) {
        redirect("/auth?mode=login")
    }

    return user
}