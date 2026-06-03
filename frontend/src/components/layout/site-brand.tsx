import Link from "next/link"
import { Code2 } from "lucide-react"

import { cn } from "@/lib/utils"

type SiteBrandProps = {
  href?: string
  className?: string
  nameClassName?: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: {
    box: "size-8 rounded-lg",
    icon: "size-4",
    text: "text-lg",
  },
  md: {
    box: "size-10 rounded-xl",
    icon: "size-5",
    text: "text-2xl",
  },
  lg: {
    box: "size-12 rounded-xl",
    icon: "size-6",
    text: "text-3xl",
  },
} as const

export function SiteBrand({
  href = "/",
  className,
  nameClassName,
  size = "md",
}: SiteBrandProps) {
  const currentSize = sizeMap[size]

  return (
    <Link href={href} className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-sm",
          currentSize.box,
        )}
      >
        <Code2 className={currentSize.icon} />
      </div>

      <span className={cn("font-semibold tracking-tight", currentSize.text, nameClassName)}>
        Вектор
      </span>
    </Link>
  )
}
