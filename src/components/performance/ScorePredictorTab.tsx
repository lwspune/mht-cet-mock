import type { SubjectProjection } from '@/types'
import ProjectedScoreCard from './ProjectedScoreCard'

interface Props {
  data: SubjectProjection[]
}

export default function ScorePredictorTab({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground">
        Score predictor is not configured yet. Ask your teacher to set up the Frequency Table.
      </p>
    )
  }

  const totalProjected = data.reduce((s, d) => s + d.projected, 0)
  const totalMax = data.reduce((s, d) => s + d.maxMarks, 0)
  const totalPct = totalProjected / totalMax

  return (
    <div className="space-y-6">
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
        {data.map((subject) => (
          <ProjectedScoreCard key={subject.subjectName} data={subject} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Chapters with "not tested" have 0 projected marks — attempting those mocks will update the predictor.
      </p>
    </div>
  )
}
