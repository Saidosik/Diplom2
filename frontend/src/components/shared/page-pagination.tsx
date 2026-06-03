import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

type PaginationMeta = {
    current_page?: number
    last_page?: number
    per_page?: number
    total?: number
}

type PagePaginationProps = {
    meta?: PaginationMeta | null
    basePath: string
    searchParams?: Record<string, string | number | null | undefined>
    className?: string
}

export function PagePagination({ meta, basePath, searchParams = {}, className = "" }: PagePaginationProps) {
    const currentPage = Number(meta?.current_page ?? 1)
    const lastPage = Number(meta?.last_page ?? 1)
    const total = Number(meta?.total ?? 0)

    if (!meta || lastPage <= 1) {
        return null
    }

    const makeHref = (page: number) => {
        const params = new URLSearchParams()

        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                params.set(key, String(value))
            }
        })

        params.set("page", String(page))

        return `${basePath}?${params.toString()}`
    }

    const pages = Array.from({ length: lastPage }, (_, index) => index + 1).filter((page) => {
        return page === 1 || page === lastPage || Math.abs(page - currentPage) <= 2
    })

    return (
        <nav className={`mt-8 flex flex-wrap items-center justify-between gap-3 border bg-card/70 px-4 py-3 ${className}`}>
            <Link
                href={makeHref(Math.max(1, currentPage - 1))}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                    currentPage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted/50"
                }`}
            >
                <ChevronLeft className="size-4" />
                Назад
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-2">
                {pages.map((page, index) => {
                    const previous = pages[index - 1]
                    const showDots = previous && page - previous > 1

                    return (
                        <div key={page} className="flex items-center gap-2">
                            {showDots && <span className="px-1 text-sm text-muted-foreground">...</span>}
                            <Link
                                href={makeHref(page)}
                                className={`min-w-9 border px-3 py-2 text-center text-sm transition-colors ${
                                    page === currentPage
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                }`}
                            >
                                {page}
                            </Link>
                        </div>
                    )
                })}
            </div>

            <Link
                href={makeHref(Math.min(lastPage, currentPage + 1))}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                    currentPage >= lastPage ? "pointer-events-none opacity-40" : "hover:bg-muted/50"
                }`}
            >
                Вперёд
                <ChevronRight className="size-4" />
            </Link>

            {total > 0 && (
                <div className="basis-full text-center text-xs text-muted-foreground">
                    Всего записей: {total}
                </div>
            )}
        </nav>
    )
}
