'use client'

import { useState } from 'react'
import Image from 'next/image'
import KatexRenderer from '@/components/math/KatexRenderer'
import { Badge } from '@/components/ui/badge'
import type { WrongAnswer } from '@/types'

interface Props {
  data: WrongAnswer[]
}

function groupLabel(item: WrongAnswer): string {
  return item.subtopicName ?? item.chapterName
}

export default function WrongAudit({ data }: Props) {
  const [subjectFilter, setSubjectFilter] = useState<string>('All')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const subjects = ['All', ...Array.from(new Set(data.map((d) => d.subjectName)))]
  const filtered = subjectFilter === 'All' ? data : data.filter((d) => d.subjectName === subjectFilter)

  if (data.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No wrong answers yet. Keep it up!</p>
  }

  // Build subtopic/chapter groups sorted worst-first
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
          <p className="text-sm text-muted-foreground">{filtered.length} wrong answer(s) across {groups.length} subtopic(s)</p>
          {groups.map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setSelectedGroup(label)}
              className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-accent transition-colors"
            >
              <span className="text-sm font-medium">{label}</span>
              <span className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">{count} wrong</Badge>
                <span className="text-muted-foreground text-xs">›</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* ── View 2: question list for selected subtopic ── */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{selectedGroup}</span>
              <Badge variant="secondary" className="text-xs">{detailItems[0]?.subjectName}</Badge>
              <Badge variant="destructive" className="text-xs">{detailItems.length} wrong</Badge>
            </div>
          </div>

          {detailItems.map((item, i) => (
            <div key={`${item.questionId}-${i}`} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{item.chapterName}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  +{item.marks} / -{item.negMarks}
                </span>
              </div>

              <div className="text-sm leading-relaxed">
                <KatexRenderer text={item.questionText} />
              </div>

              {item.questionImageUrl && (
                <Image
                  src={item.questionImageUrl}
                  alt="Question"
                  width={400}
                  height={200}
                  className="rounded object-contain max-h-40"
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-red-50 border border-red-200 p-2">
                  <p className="text-xs font-semibold text-red-600 mb-1">Your Answer</p>
                  <KatexRenderer text={item.yourOptionText} />
                </div>
                <div className="rounded-md bg-green-50 border border-green-200 p-2">
                  <p className="text-xs font-semibold text-green-600 mb-1">Correct Answer</p>
                  <KatexRenderer text={item.correctOptionText} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
