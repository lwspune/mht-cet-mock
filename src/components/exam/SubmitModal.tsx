'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { QuestionState } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  states: QuestionState[]
  isSubmitting: boolean
}

export default function SubmitModal({ open, onClose, onConfirm, states, isSubmitting }: Props) {
  const answered = states.filter((s) => s === 'answered').length
  const flagged = states.filter((s) => s === 'flagged').length
  const notAnswered = states.filter((s) => s === 'not_answered').length
  const notVisited = states.filter((s) => s === 'not_visited').length
  const total = states.length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Exam?</DialogTitle>
          <DialogDescription>
            Please review your progress before submitting. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <Stat label="Answered" value={answered} color="text-green-600" />
          <Stat label="Not Answered" value={notAnswered} color="text-red-600" />
          <Stat label="Flagged" value={flagged} color="text-purple-600" />
          <Stat label="Not Visited" value={notVisited} color="text-gray-500" />
          <Stat label="Total Questions" value={total} color="text-foreground" />
          <Stat label="Unattempted" value={notAnswered + notVisited} color="text-orange-600" />
        </div>

        {(notAnswered + notVisited) > 0 && (
          <p className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
            You have {notAnswered + notVisited} unattempted question(s). Are you sure you want to submit?
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Review More
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Exam'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}
