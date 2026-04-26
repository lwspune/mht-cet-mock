'use client'

import { useState } from 'react'
import KatexRenderer from '@/components/math/KatexRenderer'
import type { WrongAnswer } from '@/types'

interface Props {
  data: WrongAnswer[]
}

function groupLabel(item: WrongAnswer): string {
  return item.subtopicName ?? item.chapterName
}

function WrongAnswerCard({ item, index }: { item: WrongAnswer; index: number }) {
  const [showSolution, setShowSolution] = useState(false)

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Q{index}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {item.chapterName}
        </span>
        <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          Wrong
        </span>
      </div>

      {/* Question text */}
      <div className="mb-3 leading-relaxed">
        <KatexRenderer text={item.questionText} />
      </div>

      {/* Question image */}
      {item.questionImageUrl && (
        <img
          src={item.questionImageUrl}
          alt="Question diagram"
          className="mb-3 max-h-48 rounded object-contain"
        />
      )}

      {/* Options */}
      <div className="flex flex-col gap-2">
        {item.options.map((opt, i) => {
          let cls = 'rounded border px-3 py-2 '
          if (opt.isCorrect) {
            cls += 'border-green-400 bg-green-50 text-green-900'
          } else if (opt.isSelected) {
            cls += 'border-red-400 bg-red-50 text-red-900'
          } else {
            cls += 'border-border bg-background text-foreground'
          }

          return (
            <div key={i} className={cls}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {opt.isCorrect && (
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {opt.isSelected && !opt.isCorrect && (
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {!opt.isSelected && !opt.isCorrect && (
                    <span className="block h-4 w-4" />
                  )}
                </span>
                <KatexRenderer text={opt.text} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Solution */}
      {item.solution && (
        <div className="mt-3 border-t pt-3">
          <button
            onClick={() => setShowSolution((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showSolution ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {showSolution ? 'Hide solution' : 'Show solution'}
          </button>
          {showSolution && (
            <div className="mt-2 rounded bg-muted/50 px-3 py-2 text-muted-foreground leading-relaxed">
              <KatexRenderer text={item.solution} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WrongAudit({ data }: Props) {
  const [subjectFilter, setSubjectFilter] = useState<string>('All')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const subjects = ['All', ...Array.from(new Set(data.map((d) => d.subjectName)))]
  const filtered = subjectFilter === 'All' ? data : data.filter((d) => d.subjectName === subjectFilter)

  if (data.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No wrong answers yet. Keep it up!</p>
  }

  const groupMap = new Map<string, WrongAnswer[]>()
  for (const item of filtered) {
    const label = groupLabel(item)
    if (!groupMap.has(label)) groupMap.set(label, [])
    groupMap.get(label)!.push(item)
  }
  const groups = Array.from(groupMap.entries())
    .map(([label, items]) => ({ label, items, count: items.length }))
    .sort((a, b) => b.count - a.count)

  const detailItems = selectedGroup ? (groupMap.get(selectedGroup) ?? []) : []

  return (
    <div className="space-y-4">
      {/* Subject filter */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => { setSubjectFilter(s); setSelectedGroup(null) }}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              subjectFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-accent'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {selectedGroup === null ? (
        /* ── View 1: subtopic list ── */
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {filtered.length} wrong answer(s) across {groups.length} subtopic(s)
          </p>
          {groups.map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setSelectedGroup(label)}
              className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-accent transition-colors"
            >
              <span className="text-sm font-medium">{label}</span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {count} wrong
                </span>
                <span className="text-muted-foreground text-xs">›</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* ── View 2: question cards for selected subtopic ── */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <span className="text-sm font-semibold">{selectedGroup}</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {detailItems.length} wrong
            </span>
          </div>

          {detailItems.map((item, i) => (
            <WrongAnswerCard key={`${item.questionId}-${i}`} item={item} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
