'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ExamPerformance } from '@/types'

interface Props {
  data: ExamPerformance[]
}

export default function ExamWiseTable({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No exams attempted yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mock</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead>Accuracy</TableHead>
          <TableHead className="text-right">Correct</TableHead>
          <TableHead className="text-right">Wrong</TableHead>
          <TableHead className="text-right">Unattempted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.attemptId}>
            <TableCell className="font-medium max-w-[200px] truncate">{row.mockTitle}</TableCell>
            <TableCell>
              <SubjectBadge name={row.subjectName} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {new Date(row.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {row.score.toFixed(1)}/{row.maxScore.toFixed(1)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Progress value={row.accuracy} className="h-2 w-16" />
                <span className="text-xs tabular-nums">{row.accuracy}%</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-green-600 font-medium">{row.correct}</TableCell>
            <TableCell className="text-right text-red-600 font-medium">{row.wrong}</TableCell>
            <TableCell className="text-right text-muted-foreground">{row.unattempted}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SubjectBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Physics: 'bg-blue-100 text-blue-800',
    Chemistry: 'bg-green-100 text-green-800',
    Maths: 'bg-orange-100 text-orange-800',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[name] ?? 'bg-gray-100 text-gray-800'}`}>
      {name}
    </span>
  )
}
