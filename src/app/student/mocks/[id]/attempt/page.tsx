'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import QuestionCard from '@/components/exam/QuestionCard'
import QuestionNavigator from '@/components/exam/QuestionNavigator'
import ExamTimer from '@/components/exam/ExamTimer'
import SubmitModal from '@/components/exam/SubmitModal'
import type { Question, QuestionState } from '@/types'
import { formatCourseSlug } from '@/lib/utils'

interface ExamData {
  attemptId: string
  durationMins: number
  startedAt: string
  questions: Question[]
  savedAnswers: Record<string, string | null>
  savedFlags: Record<string, boolean>
  courseSlug: string
}

export default function AttemptPage() {
  const { id: mockId } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData] = useState<ExamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [visited, setVisited] = useState<Set<string>>(new Set())
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [initialSecs, setInitialSecs] = useState(0)

  const attemptIdRef = useRef<string>('')
  const pendingSavesRef = useRef<Map<string, { selectedOptionId: string | null; isFlagged: boolean }>>(new Map())
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load exam data
  useEffect(() => {
    const init = async () => {
      try {
        // Start or resume attempt
        const startRes = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mockId }),
        })

        if (startRes.status === 409) {
          toast.error('You have already submitted this mock.')
          router.push(`/student/mocks/${mockId}`)
          return
        }

        const attempt = await startRes.json()
        attemptIdRef.current = attempt.id

        // Fetch mock questions
        const [mockRes, answersRes] = await Promise.all([
          fetch(`/api/mocks/${mockId}`),
          fetch(`/api/attempts/${attempt.id}/answers`),
        ])

        const mockData = await mockRes.json()
        const savedAnswersArr: { questionId: string; selectedOptionId: string | null; isFlagged: boolean }[] =
          await answersRes.json()

        const savedAnswers: Record<string, string | null> = {}
        const savedFlags: Record<string, boolean> = {}
        for (const a of savedAnswersArr) {
          savedAnswers[a.questionId] = a.selectedOptionId
          savedFlags[a.questionId] = a.isFlagged
        }

        const startedAt = new Date(attempt.startedAt)
        const elapsedSecs = Math.floor((Date.now() - startedAt.getTime()) / 1000)
        const totalSecs = mockData.durationMins * 60
        const remaining = Math.max(0, totalSecs - elapsedSecs)

        setData({
          attemptId: attempt.id,
          durationMins: mockData.durationMins,
          startedAt: attempt.startedAt,
          questions: mockData.questions,
          savedAnswers,
          savedFlags,
          courseSlug: mockData.courseSlug,
        })

        setAnswers(savedAnswers)
        setFlags(savedFlags)
        setInitialSecs(remaining)

        // Mark first question as visited
        if (mockData.questions.length > 0) {
          setVisited(new Set([mockData.questions[0].id]))
        }
      } catch (err) {
        toast.error('Failed to load exam')
        router.push(`/student/mocks/${mockId}`)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [mockId, router])

  // Debounced save to server — values passed directly to avoid stale closure
  const scheduleSave = useCallback((questionId: string, selectedOptionId: string | null, isFlagged: boolean) => {
    pendingSavesRef.current.set(questionId, { selectedOptionId, isFlagged })
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const entries = Array.from(pendingSavesRef.current.entries())
      pendingSavesRef.current.clear()
      for (const [qid, data] of entries) {
        await fetch(`/api/attempts/${attemptIdRef.current}/answers`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qid, ...data }),
        }).catch(() => {})
      }
    }, 600)
  }, [])

  const handleSelectOption = useCallback((optionId: string) => {
    if (!data) return
    const qid = data.questions[currentIdx].id
    setAnswers((prev) => ({ ...prev, [qid]: optionId }))
    scheduleSave(qid, optionId, flags[qid] ?? false)
  }, [data, currentIdx, scheduleSave, flags])

  const handleClearResponse = useCallback(() => {
    if (!data) return
    const qid = data.questions[currentIdx].id
    setAnswers((prev) => ({ ...prev, [qid]: null }))
    scheduleSave(qid, null, flags[qid] ?? false)
  }, [data, currentIdx, scheduleSave, flags])

  const handleToggleFlag = useCallback(() => {
    if (!data) return
    const qid = data.questions[currentIdx].id
    const newFlag = !flags[qid]
    setFlags((prev) => ({ ...prev, [qid]: newFlag }))
    scheduleSave(qid, answers[qid] ?? null, newFlag)
  }, [data, currentIdx, scheduleSave, flags, answers])

  const navigateTo = useCallback((idx: number) => {
    if (!data) return
    setCurrentIdx(idx)
    setVisited((prev) => new Set([...Array.from(prev), data.questions[idx].id]))
  }, [data])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Flush any pending saves first
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const pendingEntries = Array.from(pendingSavesRef.current.entries())
      pendingSavesRef.current.clear()
      await Promise.all(
        pendingEntries.map(([qid, data]) =>
          fetch(`/api/attempts/${attemptIdRef.current}/answers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionId: qid, ...data }),
          })
        )
      )

      const res = await fetch(`/api/attempts/${attemptIdRef.current}/submit`, { method: 'POST' })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error ?? 'Submit failed')

      toast.success(`Submitted! Score: ${result.score.toFixed(1)} / ${result.maxScore.toFixed(1)}`)
      router.push('/student/performance')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submit failed')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading exam…</p>
      </div>
    )
  }

  if (!data) return null

  const questions = data.questions
  const currentQuestion = questions[currentIdx]

  const getState = (qid: string): QuestionState => {
    if (!visited.has(qid)) return 'not_visited'
    if (flags[qid]) return 'flagged'
    if (answers[qid]) return 'answered'
    return 'not_answered'
  }

  const states = questions.map((q) => getState(q.id))

  return (
    <div className="exam-layout">
      {/* Exam header */}
      <header className="border-b bg-background px-4 py-2 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-primary flex-shrink-0">{formatCourseSlug(data.courseSlug)}</span>
          <span className="text-sm text-muted-foreground truncate hidden sm:block">
            Q {currentIdx + 1} of {questions.length}
          </span>
        </div>
        <ExamTimer initialSecs={initialSecs} onExpire={handleSubmit} />
        <button
          onClick={() => setShowSubmit(true)}
          className="rounded-md bg-destructive text-destructive-foreground px-4 py-1.5 text-sm font-medium hover:bg-destructive/90 flex-shrink-0"
        >
          Submit
        </button>
      </header>

      {/* Main exam body */}
      <div className="flex overflow-hidden">
        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <QuestionCard
            question={currentQuestion}
            selectedOptionId={answers[currentQuestion.id] ?? null}
            isFlagged={flags[currentQuestion.id] ?? false}
            questionNumber={currentIdx + 1}
            onSelectOption={handleSelectOption}
            onClearResponse={handleClearResponse}
            onToggleFlag={handleToggleFlag}
            onNext={() => navigateTo(currentIdx + 1)}
            onPrev={() => navigateTo(currentIdx - 1)}
            isFirst={currentIdx === 0}
            isLast={currentIdx === questions.length - 1}
          />
        </div>

        {/* Navigator sidebar */}
        <aside className="w-56 flex-shrink-0 border-l bg-muted/10 overflow-y-auto p-3 hidden md:block">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Question Palette
          </p>
          <QuestionNavigator
            total={questions.length}
            states={states}
            current={currentIdx}
            onSelect={navigateTo}
          />
        </aside>
      </div>

      <SubmitModal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onConfirm={handleSubmit}
        states={states}
        isSubmitting={submitting}
      />
    </div>
  )
}
