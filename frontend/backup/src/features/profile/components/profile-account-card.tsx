import {
    CalendarDays,
    KeyRound,
    Mail,
    ShieldCheck,
} from "lucide-react"

import type { User } from "@/features/auth/types"
import {
    formatProfileDate,
    getRegisteredViaLabel,
    getUserRoleLabel,
} from "@/features/users/lib/user-display"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Item,
    ItemContent,
    ItemGroup,
    ItemMedia,
    ItemTitle,
    ItemDescription,
} from "@/components/ui/item"

type ProfileAccountCardProps = {
    user: User
}

export function ProfileAccountCard({ user }: ProfileAccountCardProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>
                    Данные аккаунта
                </CardTitle>

                <CardDescription>
                    Основная информация о пользователе.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <ItemGroup>
                    <ProfileInfoItem
                        icon={Mail}
                        title="Email"
                        description={user.email}
                    />

                    <ProfileInfoItem
                        icon={ShieldCheck}
                        title="Роль"
                        description={getUserRoleLabel(user.role)}
                    />

                    <ProfileInfoItem
                        icon={KeyRound}
                        title="Зарегистрирован через"
                        description={getRegisteredViaLabel(user.registered_via)}
                    />

                    <ProfileInfoItem
                        icon={CalendarDays}
                        title="Дата регистрации"
                        description={formatProfileDate(user.created_at)}
                    />
                </ItemGroup>
            </CardContent>
        </Card>
    )
}

function ProfileInfoItem({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType
    title: string
    description: string
}) {
    return (
        <Item variant="muted" size="sm">
            <ItemMedia variant="icon">
                <Icon className="size-4 text-muted-foreground" />
            </ItemMedia>

            <ItemContent>
                <ItemTitle>
                    {title}
                </ItemTitle>

                <ItemDescription>
                    {description}
                </ItemDescription>
            </ItemContent>
        </Item>
    )
}