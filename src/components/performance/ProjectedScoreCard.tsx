'use client'

import type { SubjectProjection } from '@/types'

interface Props {
  data: SubjectProjection
}

function scoreColor(pct: number) {
  if (pct >= 0.7) return 'text-green-600'
  if (pct >= 0.5) return 'text-amber-500'
  if (pct >= 0.3) return 'text-orange-500'
  return 'text-red-600'
}

function barColor(pct: number) {
  if (pct >= 0.7) return 'bg-green-500'
  if (pct >= 0.5) return 'bg-amber-400'
  if (pct >= 0.3) return 'bg-orange-400'
  return 'bg-red-500'
}

export default function ProjectedScoreCard({ data }: Props) {
  const { subjectName, maxMarks, projected, milestones, breakdown } = data
  const scorePct = projected / maxMarks
  const top6 = breakdown.slice(0, 6)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      {/* Header */}
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        Projected {subjectName} Score
      </p>

      {/* Score number + bar */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold tabular-nums ${scoreColor(scorePct)}`}>
            {projected.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/ {maxMarks}</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(scorePct)}`}
            style={{ width: `${Math.min(scorePct * 100, 100)}%` }}
          />
        </div>

        {/* Milestone markers */}
        <div className="relative h-5">
          {milestones.map((m) => (
            <span
              key={m.label}
              className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
              style={{ left: `${m.pct * 100}%` }}
              title={`${m.label}: ${Math.round(m.pct * maxMarks)}`}
            >
              {Math.round(m.pct * maxMarks)} {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Opportunities table */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Biggest Opportunities — Chapters with Highest Marks at Stake
        </p>

        {top6.map((ch) => {
          const chPct = ch.accuracy === null ? 0 : ch.accuracy
          return (
            <div key={ch.chapterId} className="flex items-center gap-3 text-sm">
              {/* Chapter name */}
              <span className="w-40 shrink-0 truncate text-foreground" title={ch.chapterName}>
                {ch.chapterName}
              </span>

              {/* Mini bar */}
              <div className="flex-1 h-1.5 rounded-full bg-muted relative overflow-hidden min-w-0">
                <div
                  className={`h-full rounded-full ${barColor(chPct)}`}
                  style={{ width: `${Math.min(chPct * 100, 100)}%` }}
                />
              </div>

              {/* Marks label */}
              <span className="text-xs tabular-nums text-muted-foreground w-24 text-right shrink-0">
                <span className={ch.accuracy === null ? 'text-red-500' : 'text-foreground'}>
                  {ch.projected.toFixed(1)}
                </span>
                {' / '}
                {ch.marksAtStake.toFixed(1)}
                {ch.accuracy === null && (
                  <span className="ml-1 text-[10px] text-muted-foreground italic">not tested</span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Based on your accuracy per chapter × MHT CET weightage. Edit weightages in Dashboard → Frequency Table.
      </p>
    </div>
  )
}
