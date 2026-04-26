'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import KatexRenderer from '@/components/math/KatexRenderer'
import { uploadQuestionImage } from '@/lib/storage'

const optionSchema = z.object({
  text: z.string().min(1, 'Option text required'),
  imageUrl: z.string().optional(),
})

const schema = z.object({
  chapterId: z.string().min(1, 'Select a chapter'),
  text: z.string().min(1, 'Question text required'),
  imageUrl: z.string().optional(),
  options: z.tuple([optionSchema, optionSchema, optionSchema, optionSchema]),
  correctIndex: z.number().min(0).max(3),
  marks: z.coerce.number().default(2),
  negMarks: z.coerce.number().default(0),
})

type FormValues = z.infer<typeof schema>

interface Props {
  mockId: string
  chapters: { id: string; name: string; subject: { name: string } }[]
  onCancel?: () => void
}

export default function QuestionEditor({ mockId, chapters, onCancel }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [questionPreview, setQuestionPreview] = useState('')
  const [optionPreviews, setOptionPreviews] = useState(['', '', '', ''])
  const [questionImageUrl, setQuestionImageUrl] = useState('')
  const [optionImageUrls, setOptionImageUrls] = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      marks: 2,
      negMarks: 0,
      correctIndex: 0,
      options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
    },
  })

  const questionText = watch('text')

  const handleImageUpload = async (file: File, target: 'question' | number) => {
    try {
      const url = await uploadQuestionImage(file)
      if (target === 'question') {
        setQuestionImageUrl(url)
        setValue('imageUrl', url)
      } else {
        const urls = [...optionImageUrls]
        urls[target] = url
        setOptionImageUrls(urls)
        setValue(`options.${target as 0|1|2|3}.imageUrl`, url)
      }
    } catch {
      toast.error('Image upload failed')
    }
  }

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const payload = {
        mockId,
        chapterId: values.chapterId,
        text: values.text,
        imageUrl: values.imageUrl,
        marks: values.marks,
        negMarks: values.negMarks,
        options: values.options.map((opt, i) => ({
          text: opt.text,
          imageUrl: opt.imageUrl,
          isCorrect: i === values.correctIndex,
        })),
      }

      const res = await fetch(`/api/mocks/${mockId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save question')

      toast.success('Question saved')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const OPTION_LABELS = ['A', 'B', 'C', 'D']

  // Group chapters by subject name
  const subjectMap = chapters.reduce<Record<string, typeof chapters>>((acc, ch) => {
    const s = ch.subject.name
    if (!acc[s]) acc[s] = []
    acc[s].push(ch)
    return acc
  }, {})

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Chapter selector */}
      <div className="space-y-1.5">
        <Label>Chapter</Label>
        <Select onValueChange={(v) => setValue('chapterId', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select chapter" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {Object.entries(subjectMap).map(([subject, chs]) => (
              <div key={subject}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {subject}
                </div>
                {chs.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
        {errors.chapterId && <p className="text-xs text-destructive">{errors.chapterId.message}</p>}
      </div>

      {/* Question text + live preview */}
      <div className="space-y-1.5">
        <Label>
          Question Text{' '}
          <span className="text-muted-foreground font-normal text-xs">(use $...$ for inline LaTeX, $$...$$ for block)</span>
        </Label>
        <Textarea
          rows={4}
          placeholder="e.g. A particle moves with velocity $v = 2t^2$. Find the acceleration at $t = 3$s."
          {...register('text', {
            onChange: (e) => setQuestionPreview(e.target.value),
          })}
        />
        {questionPreview && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1.5">Preview</p>
            <KatexRenderer text={questionPreview} />
          </div>
        )}
        {errors.text && <p className="text-xs text-destructive">{errors.text.message}</p>}
      </div>

      {/* Question image upload */}
      <div className="space-y-1.5">
        <Label>Question Image (optional)</Label>
        <input
          type="file"
          accept="image/*"
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'question')}
        />
        {questionImageUrl && (
          <div className="relative mt-2">
            <Image src={questionImageUrl} alt="Question" width={400} height={200} className="rounded border object-contain max-h-40" />
            <button
              type="button"
              onClick={() => { setQuestionImageUrl(''); setValue('imageUrl', '') }}
              className="absolute top-1 right-1 rounded bg-destructive text-destructive-foreground text-xs px-2 py-0.5"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        <Label>Options</Label>
        {OPTION_LABELS.map((label, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 space-y-2 transition-colors ${correctIndex === i ? 'border-green-400 bg-green-50' : 'border-border'}`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id={`correct-${i}`}
                name="correct"
                checked={correctIndex === i}
                onChange={() => { setCorrectIndex(i); setValue('correctIndex', i) }}
                className="h-4 w-4 accent-green-600"
              />
              <label htmlFor={`correct-${i}`} className="text-sm font-medium">
                Option {label} {correctIndex === i && <span className="text-green-600 text-xs">(Correct)</span>}
              </label>
            </div>
            <Textarea
              rows={2}
              placeholder={`Option ${label} text (LaTeX supported)`}
              {...register(`options.${i as 0|1|2|3}.text`, {
                onChange: (e) => {
                  const p = [...optionPreviews]; p[i] = e.target.value; setOptionPreviews(p)
                },
              })}
            />
            {optionPreviews[i] && (
              <div className="rounded bg-white border px-2 py-1 text-xs">
                <KatexRenderer text={optionPreviews[i]} />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-secondary"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], i)}
            />
            {optionImageUrls[i] && (
              <Image src={optionImageUrls[i]} alt={`Option ${label}`} width={200} height={80} className="rounded border object-contain max-h-20" />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save Question'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
