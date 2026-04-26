'use client'

import { useState } from 'react'
import KatexRenderer from '@/components/math/KatexRenderer'
import { Badge } from '@/components/ui/badge'
import type { UnattemptedQuestion } from '@/types'

interface Props {
  data: UnattemptedQuestion[]
}

export default function UnattemptedAudit({ data }: Props) {
  const [subjectFilter, setSubjectFilter] = useState('All')
  const subjects = ['All', ...Array.from(new Set(data.map((d) => d.subjectName)))]
  const filtered = subjectFilter === 'All' ? data : data.filter((d) => d.subjectName === subjectFilter)

  if (data.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No unattempted questions. Excellent!</p>
  }

  return (
    <div className="space-y-4">
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

      <p className="text-sm text-muted-foreground">{filtered.length} unattempted question(s)</p>

      {filtered.map((item, i) => (
        <div key={`${item.questionId}-${i}`} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{item.subjectName}</Badge>
            <Badge variant="secondary" className="text-xs">{item.chapterName}</Badge>
            <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]">
              {item.mockTitle}
            </span>
          </div>
          <div className="text-sm leading-relaxed">
            <KatexRenderer text={item.questionText} />
          </div>
        </div>
      ))}
    </div>
  )
}
