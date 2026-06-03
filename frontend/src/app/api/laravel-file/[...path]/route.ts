import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { isAxiosError } from "axios"
import { NextRequest, NextResponse } from "next/server"

type RouteContext = {
    params: Promise<{ path: string[] }>
}

async function proxyLaravelFile(request: NextRequest, context: RouteContext) {
    const { path } = await context.params
    const token = await getAccessTokenCookie()
    const laravel = createLaravelApi(token)
    const endpoint = `${path.join("/")}${request.nextUrl.search}`

    try {
        const response = await laravel.request<ArrayBuffer>({
            url: endpoint,
            method: "GET",
            responseType: "arraybuffer",
        })

        const headers = new Headers()
        const setHeader = (name: string, value: unknown) => {
            if (typeof value === "string") headers.set(name, value)
            else if (typeof value === "number") headers.set(name, String(value))
            else if (Array.isArray(value)) headers.set(name, value.join(", "))
        }

        setHeader("Content-Type", response.headers["content-type"])
        setHeader("Content-Disposition", response.headers["content-disposition"])
        setHeader("Cache-Control", response.headers["cache-control"])
        setHeader("Content-Length", response.headers["content-length"])
        headers.set("X-Content-Type-Options", "nosniff")

        return new NextResponse(Buffer.from(response.data), {
            status: response.status,
            headers,
        })
    } catch (error) {
        if (isAxiosError(error)) {
            return NextResponse.json(
                error.response?.data ?? { message: "Файл недоступен" },
                { status: error.response?.status ?? 500 }
            )
        }

        return NextResponse.json({ message: "Не удалось получить файл" }, { status: 500 })
    }
}

export const GET = proxyLaravelFile
