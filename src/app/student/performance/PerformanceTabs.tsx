'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ExamWiseTable from '@/components/performance/ExamWiseTable'
import ChapterWiseChart from '@/components/performance/ChapterWiseChart'
import WrongAudit from '@/components/performance/WrongAudit'
import UnattemptedAudit from '@/components/performance/UnattemptedAudit'
import type { ExamPerformance, ChapterPerformance, WrongAnswer, UnattemptedQuestion } from '@/types'

interface Props {
  examData: ExamPerformance[]
  chapterData: ChapterPerformance[]
  wrongData: WrongAnswer[]
  unattemptedData: UnattemptedQuestion[]
}

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Maths']

export default function PerformanceTabs({ examData, chapterData, wrongData, unattemptedData }: Props) {
  const [subjectFilter, setSubjectFilter] = useState('All')

  return (
    <Tabs defaultValue="exam">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <TabsList>
          <TabsTrigger value="exam">Exam-wise</TabsTrigger>
          <TabsTrigger value="chapter">Chapter-wise</TabsTrigger>
          <TabsTrigger value="wrong">Wrong Answers</TabsTrigger>
          <TabsTrigger value="unattempted">Unattempted</TabsTrigger>
        </TabsList>

        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <TabsContent value="exam">
        <ExamWiseTable
          data={subjectFilter === 'All' ? examData : examData.filter((d) => d.subjectName === subjectFilter)}
        />
      </TabsContent>

      <TabsContent value="chapter">
        <ChapterWiseChart
          data={chapterData}
          subjectFilter={subjectFilter === 'All' ? undefined : subjectFilter}
        />
      </TabsContent>

      <TabsContent value="wrong">
        <WrongAudit data={wrongData} />
      </TabsContent>

      <TabsContent value="unattempted">
        <UnattemptedAudit data={unattemptedData} />
      </TabsContent>
    </Tabs>
  )
}
