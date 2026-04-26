'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import ResetAttemptButton from '@/components/teacher/ResetAttemptButton'
import AttemptQuestionReview from '@/components/performance/AttemptQuestionReview'
import type { ExamPerformance, ReviewFilter, ReviewQuestion } from '@/types'

interface Props {
  data: ExamPerformance[]
  showResetButtons?: boolean
}

interface RowState {
  filter: ReviewFilter | null
  questions: ReviewQuestion[] | null
  loading: boolean
}

export default function ExamWiseTable({ data, showResetButtons }: Props) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})

  if (data.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No exams attempted yet.</p>
  }

  async function handleFilterChange(attemptId: string, filter: ReviewFilter | '') {
    if (!filter) {
      setRowStates((prev) => ({ ...prev, [attemptId]: { filter: null, questions: null, loading: false } }))
      return
    }

    const existing = rowStates[attemptId]
    if (existing?.filter === filter && existing.questions !== null) {
      // Already fetched — just re-show
      setRowStates((prev) => ({ ...prev, [attemptId]: { ...prev[attemptId], filter } }))
      return
    }

    setRowStates((prev) => ({ ...prev, [attemptId]: { filter, questions: null, loading: true } }))

    const res = await fetch(`/api/attempts/${attemptId}/questions?filter=${filter}`)
    if (!res.ok) {
      setRowStates((prev) => ({ ...prev, [attemptId]: { filter, questions: [], loading: false } }))
      return
    }
    const body = await res.json()
    setRowStates((prev) => ({ ...prev, [attemptId]: { filter, questions: body.data, loading: false } }))
  }

  const colSpan = 9 + (showResetButtons ? 1 : 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mock</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead>Accuracy</TableHead>
          <TableHead className="text-right">Correct</TableHead>
          <TableHead className="text-right">Wrong</TableHead>
          <TableHead className="text-right">Unattempted</TableHead>
          <TableHead>Review</TableHead>
          {showResetButtons && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const state = rowStates[row.attemptId]
          const activeFilter = state?.filter ?? null

          return (
            <>
              <TableRow key={row.attemptId}>
                <TableCell className="font-medium max-w-[200px] truncate">{row.mockTitle}</TableCell>
                <TableCell>
                  <SubjectBadge name={row.subjectName} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(row.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {row.score.toFixed(1)}/{row.maxScore.toFixed(1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={row.accuracy} className="h-2 w-16" />
                    <span className="text-xs tabular-nums">{row.accuracy}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600 font-medium">{row.correct}</TableCell>
                <TableCell className="text-right text-red-600 font-medium">{row.wrong}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.unattempted}</TableCell>
                <TableCell>
                  <select
                    value={activeFilter ?? ''}
                    onChange={(e) => handleFilterChange(row.attemptId, e.target.value as ReviewFilter | '')}
                    className="rounded border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Review questions for ${row.mockTitle}`}
                  >
                    <option value="">— Review —</option>
                    <option value="correct">Correct ({row.correct})</option>
                    <option value="wrong">Wrong ({row.wrong})</option>
                    <option value="unattempted">Unattempted ({row.unattempted})</option>
                  </select>
                </TableCell>
                {showResetButtons && (
                  <TableCell>
                    <ResetAttemptButton attemptId={row.attemptId} />
                  </TableCell>
                )}
              </TableRow>

              {activeFilter && (
                <TableRow key={`${row.attemptId}-review`}>
                  <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
                    {state?.loading ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Loading questions…
                      </div>
                    ) : (
                      <AttemptQuestionReview questions={state?.questions ?? []} />
                    )}
                  </TableCell>
                </TableRow>
              )}
            </>
          )
        })}
      </TableBody>
    </Table>
  )
}

function SubjectBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Physics: 'bg-blue-100 text-blue-800',
    Chemistry: 'bg-green-100 text-green-800',
    Maths: 'bg-orange-100 text-orange-800',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[name] ?? 'bg-gray-100 text-gray-800'}`}>
      {name}
    </span>
  )
}
