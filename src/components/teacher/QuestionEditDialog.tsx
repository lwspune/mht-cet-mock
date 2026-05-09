'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import QuestionEditor, { type ExistingQuestion, type SubtopicOption } from './QuestionEditor'

interface Props {
  mockId: string
  chapters: { id: string; name: string; subject: { name: string } }[]
  subtopics: SubtopicOption[]
  question: ExistingQuestion
}

export default function QuestionEditDialog({ mockId, chapters, subtopics, question }: Props) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/mocks/${mockId}/questions/${question.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      toast.success('Question deleted')
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirming(false) }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex-shrink-0" aria-label="Edit question">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <QuestionEditor
          mockId={mockId}
          chapters={chapters}
          subtopics={subtopics}
          question={question}
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />

        <div className="border-t pt-4 mt-2">
          {!confirming ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              Delete Question
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-destructive font-medium">Delete this question permanently?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
