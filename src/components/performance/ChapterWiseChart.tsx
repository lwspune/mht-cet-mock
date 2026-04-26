'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChapterPerformance } from '@/types'

interface Props {
  data: ChapterPerformance[]
  subjectFilter?: string
}

export default function ChapterWiseChart({ data, subjectFilter }: Props) {
  const filtered = subjectFilter
    ? data.filter((d) => d.subjectName === subjectFilter)
    : data

  if (filtered.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No data available.</p>
  }

  const chartData = filtered.map((d) => ({
    name: d.chapterName.length > 22 ? d.chapterName.slice(0, 22) + '…' : d.chapterName,
    fullName: d.chapterName,
    Correct: d.correct,
    Wrong: d.wrong,
    Unattempted: d.unattempted,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value, name) => [value, name]}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
        />
        <Legend />
        <Bar dataKey="Correct" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={18} />
        <Bar dataKey="Wrong" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={18} />
        <Bar dataKey="Unattempted" fill="#9ca3af" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
