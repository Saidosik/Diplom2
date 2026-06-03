// components/ui/MarkdownBlock.tsx
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ShikiCodeBlock } from "@/components/ui/ShikiCodeBlock"
import { cn } from "@/lib/utils"

export function MarkdownBlock({ content }: { content: string }) {
    return (
        <div className="prose max-w-none dark:prose-invert prose-pre:bg-transparent prose-pre:p-0 prose-pre:shadow-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code(props) {
                        const { children, className, node: _node, ...rest } = props
                        const match = /language-(\w+)/.exec(className || "")
                        const code = String(children).replace(/\n$/, "")

                        if (match) {
                            return (
                                <ShikiCodeBlock
                                    code={code}
                                    language={match[1]}
                                    compact
                                    className="not-prose my-4"
                                />
                            )
                        }

                        return (
                            <code
                                className={cn(
                                    "rounded bg-muted px-1.5 py-0.5 text-sm",
                                    className
                                )}
                                {...rest}
                            >
                                {children}
                            </code>
                        )
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
