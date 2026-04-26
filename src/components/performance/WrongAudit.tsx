'use client'

import { useState } from 'react'
import Image from 'next/image'
import KatexRenderer from '@/components/math/KatexRenderer'
import { Badge } from '@/components/ui/badge'
import type { WrongAnswer } from '@/types'

interface Props {
  data: WrongAnswer[]
}

export default function WrongAudit({ data }: Props) {
  const [subjectFilter, setSubjectFilter] = useState<string>('All')
  const subjects = ['All', ...Array.from(new Set(data.map((d) => d.subjectName)))]

  const filtered = subjectFilter === 'All' ? data : data.filter((d) => d.subjectName === subjectFilter)

  if (data.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No wrong answers yet. Keep it up!</p>
  }

  return (
    <div className="space-y-4">
      {/* Subject filter */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSubjectFilter(s)}
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

      <p className="text-sm text-muted-foreground">{filtered.length} wrong answer(s)</p>

      {filtered.map((item, i) => (
        <div key={`${item.questionId}-${i}`} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{item.subjectName}</Badge>
            <Badge variant="secondary" className="text-xs">{item.chapterName}</Badge>
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
  )
}
