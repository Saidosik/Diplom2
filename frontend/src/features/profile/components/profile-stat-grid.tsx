import {
    BookOpen,
    CircleHelp,
    MessageSquare,
    Newspaper,
} from "lucide-react"

import { ProfileStatCard } from "@/features/profile/components/profile-stat-card"

export function ProfileStatGrid() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileStatCard
                title="Публикации"
                value="0"
                description="Созданные статьи и материалы"
                icon={Newspaper}
            />

            <ProfileStatCard
                title="Вопросы"
                value="0"
                description="Вопросы в разделе сообщества"
                icon={CircleHelp}
            />

            <ProfileStatCard
                title="Ответы"
                value="0"
                description="Ответы на вопросы пользователей"
                icon={MessageSquare}
            />

            <ProfileStatCard
                title="Прогресс"
                value="0%"
                description="Прохождение курсов"
                icon={BookOpen}
            />
        </div>
    )
}
