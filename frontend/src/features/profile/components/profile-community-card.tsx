import { CircleHelp, MessageSquare, Newspaper, Tags } from "lucide-react"

import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ProfileCommunityCard() {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>
                    Активность сообщества
                </CardTitle>

                <CardDescription>
                    Публикации, вопросы, ответы и теги пользователя.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="publications">
                    <TabsList variant="line">
                        <TabsTrigger value="publications">
                            Публикации
                        </TabsTrigger>

                        <TabsTrigger value="questions">
                            Вопросы
                        </TabsTrigger>

                        <TabsTrigger value="answers">
                            Ответы
                        </TabsTrigger>

                        <TabsTrigger value="tags">
                            Теги
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="publications" className="mt-4">
                        <ProfileEmptyState
                            icon={Newspaper}
                            title="Пока нет публикаций"
                            description="Здесь появятся статьи и материалы, которые пользователь создаст в сообществе."
                        />
                    </TabsContent>

                    <TabsContent value="questions" className="mt-4">
                        <ProfileEmptyState
                            icon={CircleHelp}
                            title="Пока нет вопросов"
                            description="Здесь появятся вопросы пользователя по типу Stack Overflow / ЧАВО."
                        />
                    </TabsContent>

                    <TabsContent value="answers" className="mt-4">
                        <ProfileEmptyState
                            icon={MessageSquare}
                            title="Пока нет ответов"
                            description="Здесь появятся ответы пользователя на вопросы других участников."
                        />
                    </TabsContent>

                    <TabsContent value="tags" className="mt-4">
                        <ProfileEmptyState
                            icon={Tags}
                            title="Пока нет активности по тегам"
                            description="Здесь будут теги, с которыми пользователь чаще всего взаимодействует."
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

function ProfileEmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType
    title: string
    description: string
}) {
    return (
        <Empty className="min-h-48 border">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon className="size-5" />
                </EmptyMedia>

                <EmptyTitle>
                    {title}
                </EmptyTitle>

                <EmptyDescription>
                    {description}
                </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
                <p className="text-xs text-muted-foreground">
                    Данные появятся после активности пользователя в сообществе.
                </p>
            </EmptyContent>
        </Empty>
    )
}