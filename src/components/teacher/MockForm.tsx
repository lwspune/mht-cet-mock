'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subjectId: z.string().min(1, 'Select a subject'),
  durationMins: z.coerce.number().min(10).max(360),
  marksCorrect: z.coerce.number().min(0),
  marksWrong: z.coerce.number().min(0),
  allowReattempt: z.boolean().default(false),
})

type FormValues = z.infer<typeof schema>

interface Props {
  subjects: { id: string; name: string }[]
  defaultValues?: Partial<FormValues>
  mockId?: string
}

export default function MockForm({ subjects, defaultValues, mockId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      durationMins: 180,
      marksCorrect: 2,
      marksWrong: 0,
      allowReattempt: false,
      ...defaultValues,
    },
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const url = mockId ? `/api/mocks/${mockId}` : '/api/mocks'
      const method = mockId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save mock')

      toast.success(mockId ? 'Mock updated' : 'Mock created')
      router.push(`/teacher/mocks/${data.id}/edit`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Mock Title</Label>
        <Input id="title" placeholder="e.g. Physics Full Syllabus Mock 1" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Select
          defaultValue={defaultValues?.subjectId}
          onValueChange={(v) => setValue('subjectId', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="durationMins">Duration (mins)</Label>
          <Input id="durationMins" type="number" {...register('durationMins')} />
          {errors.durationMins && <p className="text-xs text-destructive">{errors.durationMins.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="marksCorrect">Marks (correct)</Label>
          <Input id="marksCorrect" type="number" step="0.5" {...register('marksCorrect')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="marksWrong">Negative marks</Label>
          <Input id="marksWrong" type="number" step="0.25" {...register('marksWrong')} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="allowReattempt"
          {...register('allowReattempt')}
          className="h-4 w-4 rounded accent-primary"
        />
        <Label htmlFor="allowReattempt" className="font-normal cursor-pointer">
          Allow students to reattempt this mock
        </Label>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : mockId ? 'Save Changes' : 'Create Mock & Add Questions →'}
      </Button>
    </form>
  )
}
