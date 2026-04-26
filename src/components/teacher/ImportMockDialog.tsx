'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
  ParseResponse, ParsedSubject, ImportWarning, ImportMockPayload, ImportRequest,
} from '@/lib/import-types'

type Step = 'upload' | 'reviewing' | 'importing' | 'done'

interface DoneResult { id: string; title: string; questionCount: number }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ImportMockDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [uploading, setUploading] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)

  // Per-subject editable titles
  const [titles, setTitles] = useState<Record<string, string>>({})
  // tempIds the teacher chose to skip (cross-resolved warnings)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  // Settings
  const [durationMins, setDurationMins] = useState(180)
  const [marksCorrect, setMarksCorrect] = useState(2)
  const [marksWrong, setMarksWrong] = useState(0)

  const [results, setResults] = useState<DoneResult[]>([])

  function resetDialog() {
    setStep('upload')
    setUploading(false)
    setParseResult(null)
    setTitles({})
    setSkipped(new Set())
    setDurationMins(180)
    setMarksCorrect(2)
    setMarksWrong(0)
    setResults([])
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleParse() {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Select an Excel file first'); return }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/mocks/import/parse', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to parse file'); return }

      const parsed = data as ParseResponse
      if (parsed.subjects.length === 0) {
        toast.error('No questions found in the file')
        return
      }

      // Pre-fill titles from server suggestion
      const initialTitles: Record<string, string> = {}
      for (const s of parsed.subjects) initialTitles[s.subjectKey] = s.suggestedTitle
      setTitles(initialTitles)
      setParseResult(parsed)
      setStep('reviewing')
    } catch {
      toast.error('Unexpected error — check console')
    } finally {
      setUploading(false)
    }
  }

  async function handleImport() {
    if (!parseResult) return
    setStep('importing')

    const mocks: ImportMockPayload[] = parseResult.subjects
      .filter((s) => s.questions.length > 0 || s.warnings.some((w) => w.type === 'chapter_cross_resolved'))
      .map((s) => ({
        title: titles[s.subjectKey] ?? s.suggestedTitle,
        subjectKey: s.subjectKey,
        questions: s.questions.filter((q) => !skipped.has(q.tempId)),
      }))
      .filter((m) => m.questions.length > 0)

    if (mocks.length === 0) {
      toast.error('Nothing to import — all questions were skipped')
      setStep('reviewing')
      return
    }

    const body: ImportRequest = { durationMins, marksCorrect, marksWrong, mocks }
    try {
      const res = await fetch('/api/mocks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Import failed'); setStep('reviewing'); return }
      setResults(data.mocks)
      setStep('done')
      router.refresh()
    } catch {
      toast.error('Unexpected error during import')
      setStep('reviewing')
    }
  }

  function toggleSkip(tempId: string) {
    setSkipped((prev) => {
      const next = new Set(prev)
      next.has(tempId) ? next.delete(tempId) : next.add(tempId)
      return next
    })
  }

  function totalQuestions(s: ParsedSubject) {
    return s.questions.filter((q) => !skipped.has(q.tempId)).length
  }

  function crossResolvedWarnings(s: ParsedSubject): ImportWarning[] {
    return s.warnings.filter((w) => w.type === 'chapter_cross_resolved')
  }

  function notFoundWarnings(s: ParsedSubject): ImportWarning[] {
    return s.warnings.filter((w) => w.type === 'chapter_not_found')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* ── UPLOAD STEP ── */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>Import Mocks from Excel</DialogTitle>
              <DialogDescription>
                Upload an .xlsx file with Physics, Chemistry and Maths questions.
                Each subject becomes a separate mock.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="import-file">Excel File (.xlsx)</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileRef}
                  aria-label="Excel file to import"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="imp-dur">Duration (mins)</Label>
                  <Input
                    id="imp-dur"
                    type="number"
                    value={durationMins}
                    min={10}
                    max={360}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imp-correct">Marks (correct)</Label>
                  <Input
                    id="imp-correct"
                    type="number"
                    step="0.5"
                    value={marksCorrect}
                    min={0}
                    onChange={(e) => setMarksCorrect(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imp-wrong">Negative marks</Label>
                  <Input
                    id="imp-wrong"
                    type="number"
                    step="0.25"
                    value={marksWrong}
                    min={0}
                    onChange={(e) => setMarksWrong(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button onClick={handleParse} disabled={uploading} className="w-full">
                {uploading ? 'Parsing…' : 'Parse & Preview →'}
              </Button>
            </div>
          </>
        )}

        {/* ── REVIEW STEP ── */}
        {step === 'reviewing' && parseResult && (
          <>
            <DialogHeader>
              <DialogTitle>Review Import</DialogTitle>
              <DialogDescription>
                Edit mock titles if needed. Resolve any chapter warnings before importing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-2">
              {parseResult.subjects.map((s) => (
                <div key={s.subjectKey} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-20 flex-shrink-0">{s.subjectKey}</span>
                    <Input
                      value={titles[s.subjectKey] ?? s.suggestedTitle}
                      onChange={(e) => setTitles((t) => ({ ...t, [s.subjectKey]: e.target.value }))}
                      aria-label={`Mock title for ${s.subjectKey}`}
                      className="flex-1"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {totalQuestions(s)} question{totalQuestions(s) !== 1 ? 's' : ''} will be imported
                    {notFoundWarnings(s).length > 0 && ` · ${notFoundWarnings(s).length} skipped (chapter not found)`}
                  </p>

                  {/* Chapter-not-found warnings — auto-skipped, just info */}
                  {notFoundWarnings(s).map((w) => (
                    <div key={w.tempId} className="rounded bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                      {w.message}
                    </div>
                  ))}

                  {/* Cross-resolved warnings — teacher chooses Keep or Skip */}
                  {crossResolvedWarnings(s).map((w) => (
                    <div key={w.tempId} className="rounded bg-amber-50 border border-amber-200 px-3 py-2 space-y-1.5">
                      <p className="text-xs text-amber-800">{w.message}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={skipped.has(w.tempId) ? 'outline' : 'default'}
                          className="h-7 text-xs"
                          onClick={() => skipped.has(w.tempId) && toggleSkip(w.tempId)}
                          aria-pressed={!skipped.has(w.tempId)}
                        >
                          Keep
                        </Button>
                        <Button
                          size="sm"
                          variant={skipped.has(w.tempId) ? 'destructive' : 'outline'}
                          className="h-7 text-xs"
                          onClick={() => !skipped.has(w.tempId) && toggleSkip(w.tempId)}
                          aria-pressed={skipped.has(w.tempId)}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                  ← Back
                </Button>
                <Button
                  onClick={handleImport}
                  className="flex-1"
                  disabled={parseResult.subjects.every((s) => totalQuestions(s) === 0)}
                >
                  Import {parseResult.subjects.reduce((n, s) => n + totalQuestions(s), 0)} Questions →
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── IMPORTING STEP ── */}
        {step === 'importing' && (
          <div className="py-12 text-center space-y-3">
            <div className="text-2xl">⏳</div>
            <p className="text-muted-foreground text-sm">Creating mocks and questions…</p>
          </div>
        )}

        {/* ── DONE STEP ── */}
        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>Import Complete</DialogTitle>
              <DialogDescription>
                {results.length} mock{results.length !== 1 ? 's' : ''} created successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              {results.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.questionCount} questions</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/teacher/mocks/${r.id}/edit`}>Edit →</a>
                  </Button>
                </div>
              ))}
              <Button
                className="w-full mt-2"
                onClick={() => { resetDialog(); onOpenChange(false) }}
              >
                Done
              </Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
