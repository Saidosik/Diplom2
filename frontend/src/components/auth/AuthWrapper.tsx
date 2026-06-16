import { LoginForm } from "@/components/auth/LoginForm"
import { RegisterForm } from "@/components/auth/RegisterForm"

export function AuthWrapper({ mode }: { mode: "login" | "register" }) {
    return mode === "login" ? <LoginForm /> : <RegisterForm />
}
