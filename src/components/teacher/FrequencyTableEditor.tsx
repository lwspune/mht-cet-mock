'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { SubjectFrequency } from '@/types'

interface Props {
  initialData: SubjectFrequency[]
  courseSlug: string
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export default function FrequencyTableEditor({ initialData, courseSlug }: Props) {
  const [subjects, setSubjects] = useState<SubjectFrequency[]>(initialData)
  const [activeSubject, setActiveSubject] = useState(initialData[0]?.subjectName ?? '')
  const [dirtyChapters, setDirtyChapters] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const current = subjects.find((s) => s.subjectName === activeSubject)

  function handlePctChange(chapterId: string, raw: string) {
    const val = parseFloat(raw)
    if (isNaN(val)) return
    setSubjects((prev) =>
      prev.map((s) =>
        s.subjectName !== activeSubject
          ? s
          : {
              ...s,
              chapters: s.chapters.map((ch) =>
                ch.chapterId !== chapterId
                  ? ch
                  : { ...ch, pct: val, marksAtStake: round2((val / 100) * s.maxMarks) },
              ),
            },
      ),
    )
    setDirtyChapters((prev) => new Set(prev).add(chapterId))
  }

  function saveChapter(chapterId: string, pct: number) {
    startTransition(async () => {
      const res = await fetch(`/api/course/${courseSlug}/frequency/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pct }),
      })
      if (!res.ok) {
        toast.error('Failed to save')
        return
      }
      setDirtyChapters((prev) => {
        const next = new Set(prev)
        next.delete(chapterId)
        return next
      })
      toast.success('Saved')
    })
  }

  function saveAll() {
    if (!current) return
    const dirty = current.chapters.filter((ch) => dirtyChapters.has(ch.chapterId))
    if (dirty.length === 0) { toast.info('No changes to save'); return }
    startTransition(async () => {
      await Promise.all(
        dirty.map((ch) =>
          fetch(`/api/course/${courseSlug}/frequency/${ch.chapterId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pct: ch.pct }),
          }),
        ),
      )
      setDirtyChapters((prev) => {
        const next = new Set(prev)
        dirty.forEach((ch) => next.delete(ch.chapterId))
        return next
      })
      toast.success(`Saved ${dirty.length} chapter${dirty.length > 1 ? 's' : ''}`)
    })
  }

  function resetToPyq() {
    startTransition(async () => {
      const res = await fetch(`/api/course/${courseSlug}/frequency`, { method: 'PUT' })
      if (!res.ok) { toast.error('Reset failed'); return }
      const { data } = await res.json()
      setSubjects(data)
      setDirtyChapters(new Set())
      toast.success('Reset to PYQ defaults')
    })
  }

  if (!current) return <p className="text-muted-foreground">No frequency data available.</p>

  const subjectTotal = round2(current.chapters.reduce((sum, ch) => sum + ch.pct, 0))
  const totalOk = Math.abs(subjectTotal - 100) < 0.1

  return (
    <div className="space-y-4">
      {/* Subject tabs */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map((s) => (
          <button
            key={s.subjectName}
            onClick={() => setActiveSubject(s.subjectName)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              s.subjectName === activeSubject
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s.subjectName}
            <span className="ml-1.5 text-xs opacity-70">({s.maxMarks} marks)</span>
          </button>
        ))}
      </div>

      {/* Total indicator */}
      <div className={`flex items-center gap-2 text-sm font-medium ${totalOk ? 'text-green-600' : 'text-red-600'}`}>
        <span>Total: {subjectTotal}%</span>
        {!totalOk && <span className="text-xs font-normal">(must equal 100%)</span>}
      </div>

      {/* Chapter table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2 font-medium">Chapter</th>
              <th className="text-right px-4 py-2 font-medium w-28">% of marks</th>
              <th className="text-right px-4 py-2 font-medium w-28">Marks at stake</th>
              <th className="w-16 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {current.chapters.map((ch) => {
              const isDirty = dirtyChapters.has(ch.chapterId)
              return (
                <tr key={ch.chapterId} className={`border-b last:border-0 ${isDirty ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-2 text-foreground">{ch.chapterName}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={round2(ch.pct)}
                      onChange={(e) => handlePctChange(ch.chapterId, e.target.value)}
                      className="w-full text-right rounded border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`${ch.chapterName} percentage`}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                    {round2(ch.marksAtStake).toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {isDirty && (
                      <button
                        onClick={() => saveChapter(ch.chapterId, ch.pct)}
                        disabled={isPending}
                        className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        aria-label={`Save ${ch.chapterName}`}
                      >
                        Save
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={saveAll} disabled={isPending || dirtyChapters.size === 0}>
          Save All Changes
          {dirtyChapters.size > 0 && <span className="ml-1.5 text-xs opacity-80">({dirtyChapters.size})</span>}
        </Button>
        <Button variant="outline" onClick={resetToPyq} disabled={isPending}>
          Reset to PYQ Defaults
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        "Reset to PYQ Defaults" recomputes percentages from the question distribution across all
        imported PYQ mocks.
      </p>
    </div>
  )
}
