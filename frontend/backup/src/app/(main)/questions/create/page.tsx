import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getCurrentUser } from "@/features/auth/server"
import { IssueQuestionEditor } from "@/features/issues/components/issue-question-editor"

export default async function CreateQuestionPage() {
    const user = await getCurrentUser()

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="Войдите, чтобы задать вопрос"
                    description="Гости могут читать вопросы и ответы, а новый вопрос можно опубликовать после входа в аккаунт."
                />
            </div>
        )
    }

    return <IssueQuestionEditor />
}
