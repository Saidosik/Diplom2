import { AuthWrapper } from "@/components/auth/AuthWrapper";

export default async function AuthPage({
    searchParams,
}: {
    searchParams: Promise<{ mode?: string }>; // Тип теперь Promise
}) {
    // Ожидаем разрешение промиса
    const params = await searchParams;
    const mode = params.mode === 'register' ? 'register' : 'login';

    return (
        // Ключ лучше ставить на саму форму или обертку, 
        // чтобы не перерендеривать всю страницу целиком
            <AuthWrapper mode={mode} />
    );
}