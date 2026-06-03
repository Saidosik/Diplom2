import { Badge } from "@/components/ui/badge"
import { getQuestionWorkflowMeta } from "@/features/issues/lib/issue-workflow"
import type { IssueQuestion } from "@/features/issues/types"

type IssueWorkflowBadgeProps = {
    question: IssueQuestion
    compact?: boolean
}

export function IssueWorkflowBadge({ question, compact = false }: IssueWorkflowBadgeProps) {
    const meta = getQuestionWorkflowMeta(question)
    const Icon = meta.icon

    return (
        <Badge variant="outline" className={meta.className}>
            <Icon className="size-3.5" />
            {compact ? meta.label : question.workflow_status_label || meta.label}
        </Badge>
    )
}
