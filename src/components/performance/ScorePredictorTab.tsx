'use client'

import { useState } from 'react'
import type { SubjectProjection } from '@/types'
import ProjectedScoreCard from './ProjectedScoreCard'

interface Props {
  data: SubjectProjection[]
  recentData?: SubjectProjection[]
}

export default function ScorePredictorTab({ data, recentData }: Props) {
  const [mode, setMode] = useState<'all' | 'recent'>('all')

  const hasRecent = recentData && recentData.length > 0
  const active = mode === 'recent' && hasRecent ? recentData : data

  if (active.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground">
        Score predictor is not configured yet. Ask your teacher to set up the Frequency Table.
      </p>
    )
  }

  const totalProjected = active.reduce((s, d) => s + d.projected, 0)
  const totalMax = active.reduce((s, d) => s + d.maxMarks, 0)
  const totalPct = totalProjected / totalMax

  return (
    <div className="space-y-6">
      {hasRecent && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border bg-muted p-1 gap-1">
            <button
              onClick={() => setMode('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                mode === 'all'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All-time
            </button>
            <button
              onClick={() => setMode('recent')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                mode === 'recent'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recent (Last 3)
            </button>
          </div>
        </div>
      )}

      {/* Combined total */}
      <div className="rounded-xl border bg-muted/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Projected PCM Total
          </p>
          <p className="text-3xl font-bold tabular-nums mt-0.5">
            {totalProjected.toFixed(1)}
            <span className="text-base font-normal text-muted-foreground ml-1">/ {totalMax}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Overall accuracy</p>
          <p className="text-xl font-semibold">{Math.round(totalPct * 100)}%</p>
        </div>
      </div>

      {/* Per-subject cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {active.map((subject) => (
          <ProjectedScoreCard key={subject.subjectName} data={subject} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {mode === 'recent'
          ? 'Based on your 3 most recent mocks per subject. Chapters outside those mocks show as "not tested".'
          : 'Chapters with "not tested" have 0 projected marks — attempting those mocks will update the predictor.'}
      </p>
    </div>
  )
}
