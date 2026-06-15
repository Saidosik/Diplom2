"use client"

import * as React from "react"
import { Lock } from "lucide-react"

import type { User } from "@/features/auth/types"
import type { CommentItem } from "@/features/interactions/types"
import type { IssueAnswer, IssueQuestion } from "@/features/issues/types"
import type { Publication } from "@/features/publications/types"
import { Card, CardContent } from "@/components/ui/card"
import { ProfileCommunityDashboard } from "@/features/profile/components/profile-community-dashboard"
import { getPublicProfileAnswers, getPublicProfileComments, getPublicProfilePublications, getPublicProfileQuestions } from "@/features/users/api"
import type { PublicProfile } from "@/features/users/types"

function asDashboardUser(profile: PublicProfile): User {
  return { ...profile, email: "" }
}

export function PublicProfilePageContent({ profile, isAuthenticated = false }: { profile: PublicProfile; isAuthenticated?: boolean }) {
  const [publications, setPublications] = React.useState<Publication[]>([])
  const [questions, setQuestions] = React.useState<IssueQuestion[]>([])
  const [answers, setAnswers] = React.useState<IssueAnswer[]>([])
  const [comments, setComments] = React.useState<CommentItem[]>([])
  const [loading, setLoading] = React.useState(profile.can_view_full_profile !== false)

  React.useEffect(() => {
    if (profile.can_view_full_profile === false) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [pubs, qs, ans, comms] = await Promise.all([
          getPublicProfilePublications(profile.id, { per_page: 12 }),
          getPublicProfileQuestions(profile.id, { per_page: 12 }),
          getPublicProfileAnswers(profile.id, { per_page: 12 }),
          getPublicProfileComments(profile.id, { per_page: 12 }),
        ])
        if (!cancelled) {
          setPublications(pubs.data || [])
          setQuestions(qs.data || [])
          setAnswers(ans.data || [])
          setComments(comms.data || [])
        }
      } catch (error) {
        console.log("[PUBLIC_PROFILE_DASHBOARD_LOAD_ERROR]", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [profile.id, profile.can_view_full_profile])

  const stats = {
    reputation: profile.reputation_score || 0,
    publications: profile.stats?.publications_count ?? publications.length,
    questions: profile.stats?.questions_count ?? questions.length,
    answers: profile.stats?.answers_count ?? answers.length,
    comments: profile.stats?.comments_count ?? comments.length,
    acceptedAnswers: profile.stats?.accepted_answers_count,
    likes: publications.reduce((sum, item) => sum + (item.likes_count || 0), 0) + questions.reduce((sum, item) => sum + (item.likes_count || 0), 0),
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Профиль пользователя</h1>
        <p className="text-sm text-muted-foreground">Публичная страница участника: вклад, активность, материалы и репутация.</p>
      </div>
      {profile.can_view_full_profile === false ? (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground"><Lock className="size-5 shrink-0 text-amber-500" />Пользователь ограничил доступ к активности. Приватные данные, email, сохранённое и настройки не отображаются.</CardContent>
        </Card>
      ) : null}
      <ProfileCommunityDashboard isOwnProfile={false} user={asDashboardUser(profile)} isAuthenticated={isAuthenticated} stats={stats} publications={publications} questions={questions} answers={answers} comments={comments} loading={loading} canViewFullProfile={profile.can_view_full_profile !== false} />
    </div>
  )
}
