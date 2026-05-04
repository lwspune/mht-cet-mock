import { requireRole } from '@/lib/auth'
import { getSubjectFrequencies } from '@/lib/performance'
import FrequencyTableEditor from '@/components/teacher/FrequencyTableEditor'

export default async function FrequencyPage() {
  await requireRole('TEACHER')
  const data = await getSubjectFrequencies('mht-cet')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MHT CET Frequency Table</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set the % of marks each chapter contributes in the actual MHT CET exam.
          Used to compute the Score Predictor shown to students.
        </p>
      </div>
      <FrequencyTableEditor initialData={data} courseSlug="mht-cet" />
    </div>
  )
}
