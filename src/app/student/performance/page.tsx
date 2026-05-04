import { requireRole } from '@/lib/auth'
import {
  getExamPerformance,
  getChapterPerformance,
  getWrongAnswers,
  getUnattemptedQuestions,
  getProjectedScores,
} from '@/lib/performance'
import PerformanceTabs from './PerformanceTabs'

export default async function StudentPerformancePage() {
  const user = await requireRole('STUDENT')
  return <PerformanceDashboard studentId={user.id} />
}

async function PerformanceDashboard({ studentId }: { studentId: string }) {
  const [examPerf, chapterPerf, wrongAnswers, unattempted, projectedScores] = await Promise.all([
    getExamPerformance(studentId),
    getChapterPerformance(studentId),
    getWrongAnswers(studentId),
    getUnattemptedQuestions(studentId),
    getProjectedScores(studentId),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Performance</h1>
      <PerformanceTabs
        examData={examPerf}
        chapterData={chapterPerf}
        wrongData={wrongAnswers}
        unattemptedData={unattempted}
        projectedScores={projectedScores}
      />
    </div>
  )
}
