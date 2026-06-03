import { StatusPage } from "@/components/errors/status-page"

export default function MainNotFoundPage() {
    return (
        <StatusPage
            status="404"
            eyebrow="Страница не найдена"
            title="Такого маршрута в сообществе нет"
            description="Материал мог быть удалён, скрыт модерацией, ещё не опубликован или ссылка содержит ошибку. Используй поиск по публикациям и вопросам, чтобы найти нужную тему."
            details="Проверь адрес в строке браузера или вернись к поиску по материалам сообщества."
        />
    )
}
