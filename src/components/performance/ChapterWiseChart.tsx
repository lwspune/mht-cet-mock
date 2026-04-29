'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import KatexRenderer from '@/components/math/KatexRenderer'
import type { ChapterPerformance, WrongAnswer, UnattemptedQuestion } from '@/types'

interface Props {
  data: ChapterPerformance[]
  subjectFilter?: string
  wrongData: WrongAnswer[]
  unattemptedData: UnattemptedQuestion[]
}

function pct(correct: number, total: number) {
  return total > 0 ? (correct / total) * 100 : 0
}

function barColor(p: number) {
  if (p < 40) return '#ef4444'
  if (p < 70) return '#f59e0b'
  return '#22c55e'
}

function WrongAnswerCard({ item, index }: { item: WrongAnswer; index: number }) {
  const [showSolution, setShowSolution] = useState(false)

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
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

      <div className="mb-3 leading-relaxed">
        <KatexRenderer text={item.questionText} />
      </div>

      {item.questionImageUrl && (
        <img
          src={item.questionImageUrl}
          alt="Question diagram"
          className="mb-3 max-h-48 rounded object-contain"
        />
      )}

      <div className="flex flex-col gap-2">
        {item.options.map((opt, i) => {
          let cls = 'rounded border px-3 py-2 '
          if (opt.isCorrect) cls += 'border-green-400 bg-green-50 text-green-900'
          else if (opt.isSelected) cls += 'border-red-400 bg-red-50 text-red-900'
          else cls += 'border-border bg-background text-foreground'

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
                  {!opt.isSelected && !opt.isCorrect && <span className="block h-4 w-4" />}
                </span>
                <KatexRenderer text={opt.text} />
              </div>
            </div>
          )
        })}
      </div>

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

function UnattemptedCard({ item, index }: { item: UnattemptedQuestion; index: number }) {
  const [showSolution, setShowSolution] = useState(false)

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Q{index}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {item.chapterName}
        </span>
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          Unattempted
        </span>
      </div>

      <div className="mb-3 leading-relaxed">
        <KatexRenderer text={item.questionText} />
      </div>

      {item.questionImageUrl && (
        <img
          src={item.questionImageUrl}
          alt="Question diagram"
          className="mb-3 max-h-48 rounded object-contain"
        />
      )}

      <div className="flex flex-col gap-2">
        {item.options.map((opt, i) => {
          const cls = opt.isCorrect
            ? 'rounded border px-3 py-2 border-green-400 bg-green-50 text-green-900'
            : 'rounded border px-3 py-2 border-border bg-background text-foreground'

          return (
            <div key={i} className={cls}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {opt.isCorrect ? (
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="block h-4 w-4" />
                  )}
                </span>
                <KatexRenderer text={opt.text} />
              </div>
            </div>
          )
        })}
      </div>

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

export default function ChapterWiseChart({ data, subjectFilter, wrongData, unattemptedData }: Props) {
  const [selected, setSelected] = useState<ChapterPerformance | null>(null)

  useEffect(() => {
    setSelected(null)
  }, [subjectFilter])

  const filtered = subjectFilter
    ? data.filter((d) => d.subjectName === subjectFilter)
    : data

  if (filtered.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No data available.</p>
  }

  const chartData = filtered
    .map((d) => ({
      name: d.chapterName.length > 18 ? d.chapterName.slice(0, 18) + '…' : d.chapterName,
      fullName: d.chapterName,
      pctCorrect: pct(d.correct, d.total),
      original: d,
    }))
    .sort((a, b) => a.pctCorrect - b.pctCorrect)

  if (selected) {
    const chapterWrong = wrongData.filter(
      (q) => q.chapterName === selected.chapterName && q.subjectName === selected.subjectName
    )
    const chapterUnattempted = unattemptedData.filter(
      (q) => q.chapterName === selected.chapterName && q.subjectName === selected.subjectName
    )
    const hasReview = chapterWrong.length > 0 || chapterUnattempted.length > 0

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← Back
          </button>
          <span className="text-sm font-semibold">{selected.chapterName}</span>
          <span className="text-xs text-muted-foreground">{selected.subjectName}</span>
        </div>

        {!hasReview && (
          <p className="text-center py-10 text-muted-foreground">All correct — nothing to review.</p>
        )}

        {chapterWrong.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Wrong Answers
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {chapterWrong.length}
              </span>
            </h3>
            {chapterWrong.map((item, i) => (
              <WrongAnswerCard key={`${item.questionId}-${i}`} item={item} index={i + 1} />
            ))}
          </div>
        )}

        {chapterUnattempted.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Unattempted
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {chapterUnattempted.length}
              </span>
            </h3>
            {chapterUnattempted.map((item, i) => (
              <UnattemptedCard key={`${item.questionId}-${i}`} item={item} index={i + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-500" />
          Weak (&lt;40%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
          Moderate (40–70%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
          Strong (≥70%)
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Tap a bar to review wrong &amp; unattempted questions.</p>
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 40)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, '% Correct']}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? _label}
          />
          <Bar
            dataKey="pctCorrect"
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
            minPointSize={4}
            cursor="pointer"
            onClick={(data) => setSelected(data.original)}
            label={{ position: 'right', formatter: (v: number) => `${v.toFixed(0)}%`, fontSize: 11 }}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.pctCorrect)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
