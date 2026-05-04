'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ExamWiseTable from '@/components/performance/ExamWiseTable'
import ChapterWiseChart from '@/components/performance/ChapterWiseChart'
import WrongAudit from '@/components/performance/WrongAudit'
import UnattemptedAudit from '@/components/performance/UnattemptedAudit'
import ScorePredictorTab from '@/components/performance/ScorePredictorTab'
import type { ExamPerformance, ChapterPerformance, WrongAnswer, UnattemptedQuestion, SubjectProjection } from '@/types'

interface Props {
  examData: ExamPerformance[]
  chapterData: ChapterPerformance[]
  wrongData: WrongAnswer[]
  unattemptedData: UnattemptedQuestion[]
  projectedScores?: SubjectProjection[]
  recentScores?: SubjectProjection[]
  showResetButtons?: boolean
}

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Maths']

export default function PerformanceTabs({ examData, chapterData, wrongData, unattemptedData, projectedScores = [], recentScores, showResetButtons }: Props) {
  const [subjectFilter, setSubjectFilter] = useState('All')

  return (
    <Tabs defaultValue="exam">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="exam">Exam-wise</TabsTrigger>
          <TabsTrigger value="chapter">Chapter-wise</TabsTrigger>
          <TabsTrigger value="wrong">Wrong Answers</TabsTrigger>
          <TabsTrigger value="unattempted">Unattempted</TabsTrigger>
          <TabsTrigger value="predictor">Score Predictor</TabsTrigger>
        </TabsList>

        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9">
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
          showResetButtons={showResetButtons}
        />
      </TabsContent>

      <TabsContent value="chapter">
        <ChapterWiseChart
          data={chapterData}
          subjectFilter={subjectFilter === 'All' ? undefined : subjectFilter}
          wrongData={wrongData}
          unattemptedData={unattemptedData}
        />
      </TabsContent>

      <TabsContent value="wrong">
        <WrongAudit data={wrongData} />
      </TabsContent>

      <TabsContent value="unattempted">
        <UnattemptedAudit data={unattemptedData} />
      </TabsContent>

      <TabsContent value="predictor">
        <ScorePredictorTab
          data={subjectFilter === 'All' ? projectedScores : projectedScores.filter((d) => d.subjectName === subjectFilter)}
          recentData={recentScores ? (subjectFilter === 'All' ? recentScores : recentScores.filter((d) => d.subjectName === subjectFilter)) : undefined}
        />
      </TabsContent>
    </Tabs>
  )
}
