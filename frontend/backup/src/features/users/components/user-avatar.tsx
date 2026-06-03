import type { User } from "@/features/auth/types"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
    getUserAvatarUrl,
    getUserInitials,
} from "@/features/users/lib/user-display"

type UserAvatarProps = {
    user: Pick<User, "name" | "avatar" | "avatar_url"> & { email?: string | null }
    className?: string
    size?: "sm" | "default" | "lg" | "xl"
}

const avatarSizeClassNames = {
    sm: "size-8 text-xs",
    default: "size-10 text-sm",
    lg: "size-16 text-lg",
    xl: "size-28 text-3xl",
}

export function UserAvatar({
    user,
    className,
    size = "default",
}: UserAvatarProps) {
    const avatarUrl = getUserAvatarUrl(user)
    const initials = getUserInitials(user.name, user.email)

    return (
        <Avatar className={cn(avatarSizeClassNames[size], className)}>
            {avatarUrl && (
                <AvatarImage
                    src={avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                />
            )}

            <AvatarFallback>
                {initials}
            </AvatarFallback>
        </Avatar>
    )
}