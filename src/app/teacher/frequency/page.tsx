import { requireRole } from '@/lib/auth'
import { getSubjectFrequencies } from '@/lib/performance'
import { formatCourseSlug } from '@/lib/utils'
import FrequencyTableEditor from '@/components/teacher/FrequencyTableEditor'

export default async function FrequencyPage() {
  const teacher = await requireRole('TEACHER')
  const data = await getSubjectFrequencies(teacher.courseSlug)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{formatCourseSlug(teacher.courseSlug)} Frequency Table</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set the % of marks each chapter contributes in this exam.
          Used to compute the Score Predictor shown to students.
        </p>
      </div>
      <FrequencyTableEditor initialData={data} courseSlug={teacher.courseSlug} />
    </div>
  )
}
