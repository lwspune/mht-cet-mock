'use client'

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
import type { ChapterPerformance } from '@/types'

interface Props {
  data: ChapterPerformance[]
  subjectFilter?: string
}

function pct(correct: number, total: number) {
  return total > 0 ? (correct / total) * 100 : 0
}

function barColor(p: number) {
  if (p < 40) return '#ef4444'
  if (p < 70) return '#f59e0b'
  return '#22c55e'
}

export default function ChapterWiseChart({ data, subjectFilter }: Props) {
  const filtered = subjectFilter
    ? data.filter((d) => d.subjectName === subjectFilter)
    : data

  if (filtered.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No data available.</p>
  }

  const chartData = filtered
    .map((d) => ({
      name: d.chapterName.length > 22 ? d.chapterName.slice(0, 22) + '…' : d.chapterName,
      fullName: d.chapterName,
      pctCorrect: pct(d.correct, d.total),
    }))
    .sort((a, b) => a.pctCorrect - b.pctCorrect)

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
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
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
            width={160}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, '% Correct']}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? _label}
          />
          <Bar dataKey="pctCorrect" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', formatter: (v: number) => `${v.toFixed(0)}%`, fontSize: 11 }}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.pctCorrect)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
