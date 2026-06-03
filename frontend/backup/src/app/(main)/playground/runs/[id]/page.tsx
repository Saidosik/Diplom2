import { CodeRunDetailPage } from "@/features/playground/components/code-run-detail-page"

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function PlaygroundRunPage({ params }: PageProps) {
    const { id } = await params
    const runId = Number(id)

    return <CodeRunDetailPage runId={Number.isFinite(runId) ? runId : 0} />
}
