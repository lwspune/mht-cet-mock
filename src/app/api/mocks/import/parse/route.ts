import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import { convertLatex, answerLetterToIndex, deriveTitleFromFilename } from '@/lib/import-utils'
import type { ParsedQuestion, ImportWarning, ParsedSubject, ParseResponse } from '@/lib/import-types'

const EXPECTED_HEADERS = ['Q', 'Subject', 'Course', 'Chapter', 'Subtopic', 'Question Context',
  'Question', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'Answer', 'Solution', 'Difficulty Level']

export async function POST(request: NextRequest) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return NextResponse.json({ error: 'Excel file has no sheets' }, { status: 400 })
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })
  if (rows.length < 2) {
    return NextResponse.json({ error: 'Excel file has no data rows' }, { status: 400 })
  }

  const headers = rows[0] as string[]
  for (const expected of EXPECTED_HEADERS) {
    if (!headers.includes(expected)) {
      return NextResponse.json({ error: `Missing column: "${expected}"` }, { status: 400 })
    }
  }

  const col = (name: string) => headers.indexOf(name)

  // Build chapter lookup: { "SubjectKey|ChapterName" → chapterId }
  // Also build fallback: { "ChapterName" → { subjectKey, chapterId } }
  const allChapters = await db.chapter.findMany({ include: { subject: true } })
  const chapterMap = new Map<string, string>()
  const chapterFallback = new Map<string, { subjectKey: string; chapterId: string }>()

  for (const ch of allChapters) {
    const key = `${ch.subject.name}|${ch.name}`
    chapterMap.set(key, ch.id)
    if (!chapterFallback.has(ch.name)) {
      chapterFallback.set(ch.name, { subjectKey: ch.subject.name, chapterId: ch.id })
    }
  }

  const subjectRecords = await db.subject.findMany()
  const subjectIdMap = new Map(subjectRecords.map((s) => [s.name, s.id]))

  const subjectGroups = new Map<string, { questions: ParsedQuestion[]; warnings: ImportWarning[] }>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const rowNum = i + 1

    const subjectKey = String(row[col('Subject')] ?? '').trim()
    const chapterName = String(row[col('Chapter')] ?? '').trim()
    const subtopicName = String(row[col('Subtopic')] ?? '').trim() || null
    const questionText = row[col('Question')]
    const optA = row[col('OptionA')]
    const optB = row[col('OptionB')]
    const optC = row[col('OptionC')]
    const optD = row[col('OptionD')]
    const answerLetter = String(row[col('Answer')] ?? '').trim()
    const solution = row[col('Solution')]
    const pyqYear = headers.includes('PYQ') ? String(row[col('PYQ')] ?? '').trim() || null : null

    if (!subjectKey || !questionText) continue

    if (!subjectGroups.has(subjectKey)) {
      subjectGroups.set(subjectKey, { questions: [], warnings: [] })
    }
    const group = subjectGroups.get(subjectKey)!

    const correctIndex = answerLetterToIndex(answerLetter)
    if (correctIndex === undefined) {
      group.warnings.push({
        tempId: `row_${rowNum}`,
        rowNum,
        type: 'chapter_not_found',
        message: `Row ${rowNum}: invalid answer letter "${answerLetter}" — question skipped`,
      })
      continue
    }

    let resolvedSubjectKey = subjectKey
    const directKey = `${subjectKey}|${chapterName}`
    let chapterId = chapterMap.get(directKey)

    if (!chapterId) {
      const fallback = chapterFallback.get(chapterName)
      if (fallback) {
        chapterId = fallback.chapterId
        resolvedSubjectKey = fallback.subjectKey
        group.warnings.push({
          tempId: `row_${rowNum}`,
          rowNum,
          type: 'chapter_cross_resolved',
          message: `Row ${rowNum}: chapter "${chapterName}" not found under ${subjectKey} — resolved to ${resolvedSubjectKey} subject instead`,
        })
      } else {
        group.warnings.push({
          tempId: `row_${rowNum}`,
          rowNum,
          type: 'chapter_not_found',
          message: `Row ${rowNum}: chapter "${chapterName}" not found in any subject — question skipped`,
        })
        continue
      }
    }

    group.questions.push({
      tempId: `row_${rowNum}`,
      rowNum,
      chapterName,
      subtopicName,
      resolvedSubjectKey,
      text: convertLatex(questionText as string),
      options: [optA, optB, optC, optD].map((o) => convertLatex(o as string) || '—'),
      correctIndex,
      solution: solution ? convertLatex(solution as string) : null,
      pyqYear,
    })
  }

  const subjects: ParsedSubject[] = Array.from(subjectGroups.entries()).flatMap(([subjectKey, group]) => {
    const subjectId = subjectIdMap.get(subjectKey)
    if (!subjectId) return []
    return [{
      subjectId,
      subjectKey,
      suggestedTitle: deriveTitleFromFilename(file.name, subjectKey),
      questions: group.questions,
      warnings: group.warnings,
    }]
  })

  const ORDER = ['Physics', 'Chemistry', 'Maths']
  subjects.sort((a, b) => ORDER.indexOf(a.subjectKey) - ORDER.indexOf(b.subjectKey))

  const response: ParseResponse = { subjects, filename: file.name }
  return NextResponse.json(response)
}
