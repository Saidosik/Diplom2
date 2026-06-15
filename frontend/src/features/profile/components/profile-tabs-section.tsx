"use client"

import * as React from "react"
import type { User } from "@/features/auth/types"
import type { Publication } from "@/features/publications/types"
import type { IssueAnswer, IssueQuestion } from "@/features/issues/types"
import type { CommentItem, SavedItem } from "@/features/interactions/types"
import { getProfileComments, getProfileIssueAnswers, getProfileIssueQuestions, getProfilePublications } from "@/features/profile/api"
import { getSavedItems } from "@/features/interactions/api"
import { ProfileCommunityDashboard } from "@/features/profile/components/profile-community-dashboard"

export function ProfileTabsSection({ user }: { user: User }) {
  const [publications, setPublications] = React.useState<Publication[]>([])
  const [questions, setQuestions] = React.useState<IssueQuestion[]>([])
  const [answers, setAnswers] = React.useState<IssueAnswer[]>([])
  const [comments, setComments] = React.useState<CommentItem[]>([])
  const [savedItems, setSavedItems] = React.useState<SavedItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [pubs, qs, ans, comms, saved] = await Promise.all([
          getProfilePublications({ per_page: 12 }),
          getProfileIssueQuestions({ per_page: 12 }),
          getProfileIssueAnswers({ per_page: 12 }),
          getProfileComments({ per_page: 12 }),
          getSavedItems({ per_page: 24 }),
        ])
        if (!cancelled) {
          setPublications(pubs.data || [])
          setQuestions(qs.data || [])
          setAnswers(ans.data || [])
          setComments(comms.data || [])
          setSavedItems((saved.data || []).filter((item) => Boolean(item.item)))
        }
      } catch (error) {
        console.log("[PROFILE_DASHBOARD_LOAD_ERROR]", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const stats = {
    reputation: user.reputation_score || 0,
    publications: publications.length,
    questions: questions.length,
    answers: answers.length,
    comments: comments.length,
    likes: publications.reduce((sum, item) => sum + (item.likes_count || 0), 0) + questions.reduce((sum, item) => sum + (item.likes_count || 0), 0),
    saved: savedItems.length,
  }

  return <ProfileCommunityDashboard isOwnProfile user={user} stats={stats} publications={publications} questions={questions} answers={answers} comments={comments} savedItems={savedItems} loading={loading} />
}
