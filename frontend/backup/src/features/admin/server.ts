import "server-only"

import { redirect } from "next/navigation"
import { requireUser } from "@/features/auth/server"

function isAdminRole(user: { role?: string; meta?: { isAdmin?: boolean; canManageSystem?: boolean } }) {
    return user.meta?.isAdmin === true || user.meta?.canManageSystem === true || user.role === "admin"
}

function isStaffRole(user: { role?: string; meta?: { isAdmin?: boolean; isModerator?: boolean; isStaff?: boolean } }) {
    return user.meta?.isStaff === true || user.meta?.isAdmin === true || user.meta?.isModerator === true || user.role === "admin" || user.role === "moderator"
}

export async function requireStaff() {
    const user = await requireUser()

    if (!isStaffRole(user)) {
        redirect("/")
    }

    return user
}

export async function requireSystemAdmin() {
    const user = await requireStaff()

    if (!isAdminRole(user)) {
        redirect("/admin")
    }

    return user
}

export async function requireAdmin() {
    return requireStaff()
}

export function canManageSystem(user: { role?: string; meta?: { isAdmin?: boolean; canManageSystem?: boolean } }) {
    return isAdminRole(user)
}
