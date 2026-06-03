import {
    CheckCircle2,
    KeyRound,
    MailWarning,
} from "lucide-react"

import type { User } from "@/features/auth/types"
import { getRegisteredViaLabel } from "@/features/users/lib/user-display"
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
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item"

type ProfileSecurityCardProps = {
    user: User
}

export function ProfileSecurityCard({ user }: ProfileSecurityCardProps) {
    const isEmailVerified = Boolean(
        user.is_email_verified || user.email_verified_at
    )

    const EmailIcon = isEmailVerified ? CheckCircle2 : MailWarning

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>
                    Безопасность
                </CardTitle>

                <CardDescription>
                    Статус входа и подтверждения аккаунта.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <ItemGroup>
                    <Item variant="muted" size="sm">
                        <ItemMedia variant="icon">
                            <EmailIcon className="size-4 text-muted-foreground" />
                        </ItemMedia>

                        <ItemContent>
                            <ItemTitle>
                                Почта
                            </ItemTitle>

                            <ItemDescription>
                                {isEmailVerified
                                    ? "Подтверждена"
                                    : "Не подтверждена"}
                            </ItemDescription>
                        </ItemContent>
                    </Item>

                    <Item variant="muted" size="sm">
                        <ItemMedia variant="icon">
                            <KeyRound className="size-4 text-muted-foreground" />
                        </ItemMedia>

                        <ItemContent>
                            <ItemTitle>
                                Способ входа
                            </ItemTitle>

                            <ItemDescription>
                                {getRegisteredViaLabel(user.registered_via)}
                            </ItemDescription>
                        </ItemContent>
                    </Item>
                </ItemGroup>
            </CardContent>
        </Card>
    )
}