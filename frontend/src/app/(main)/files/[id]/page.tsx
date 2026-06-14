import { FilePreviewPage } from "@/features/files/components/file-preview-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <FilePreviewPage id={Number(id)} />
}
