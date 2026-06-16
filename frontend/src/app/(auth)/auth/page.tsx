import { AuthWrapper } from "@/components/auth/AuthWrapper"

export default async function AuthPage({
    searchParams,
}: {
    searchParams: Promise<{ mode?: string }>
}) {
    const params = await searchParams
    const mode = params.mode === "register" ? "register" : "login"

    return <AuthWrapper mode={mode} />
}
