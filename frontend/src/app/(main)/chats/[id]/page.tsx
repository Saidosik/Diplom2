import { ChatRoomPage } from "@/features/chat/components/chat-room-page"

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
    const { id } = await params
    return <ChatRoomPage conversationId={id} />
}
