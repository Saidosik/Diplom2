import { StatusPage } from "@/components/errors/status-page"
import { getCurrentUser } from "@/features/auth/server"

export default async function ForbiddenPage() {
    const user = await getCurrentUser()

    return (
        <StatusPage
            status="403"
            eyebrow="Доступ закрыт"
            title="Недостаточно прав для этого раздела"
            description="Этот маршрут доступен только участникам с нужными правами. Войдите в аккаунт или вернитесь к публичной ленте сообщества."
            details={user ? "Если доступ нужен для работы, запросите роль у администратора проекта." : "Гостям доступны лента, поиск, публикации, вопросы, теги и участники."}
            variant="forbidden"
            showLoginAction={!user}
        />
    )
}
