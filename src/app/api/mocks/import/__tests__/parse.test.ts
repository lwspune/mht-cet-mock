import { describe, it, expect, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { ParseResponse } from '@/lib/import-types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  apiRequireRole: vi.fn().mockResolvedValue({
    user: { id: 'test-teacher-id', role: 'TEACHER' },
  }),
}))

// Realistic chapter/subject data mirroring the seed (same names the route must match)
const PHYSICS_CHAPTERS = [
  'Electromagnetic Induction', 'Mechanical Properties of Fluids', 'Semiconductor Devices',
  'Electrostatics (12th)', 'Gravitation', 'Kinetic Theory of Gases', 'Laws of Motion',
  'Magnetic Fields Due to Electric Current', 'Magnetic Materials', 'Motion in a Plane',
  'Optics (Ray)', 'Oscillations', 'Rotational Dynamics', 'Sound', 'Structure of Atoms and Nuclei',
  'Superposition of Waves', 'Thermal Properties of Matter', 'Thermodynamics', 'Wave Optics',
  'Current Electricity', 'AC Circuits', 'Dual Nature of Radiation and Matter',
]
const CHEMISTRY_CHAPTERS = [
  'Ionic Equilibria', 'Chemical Bonding and Molecular Structure', 'Alcohols, Phenols and Ethers',
  'Aldehydes, Ketones and Carboxylic Acids', 'Alkanes', 'Alkynes', 'Amines',
  'Basic Principles of Organic Chemistry', 'Biomolecules', 'Chemical Kinetics',
  'Chemical Thermodynamics and Energetics', 'Coordination Compounds', 'Electrochemistry',
  'Elements of Group 1 and 2', 'Elements of Group 13, 14 and 15', 'Elements of Group 16, 17 and 18',
  'Environmental Chemistry', 'Green Chemistry and Nanochemistry', 'Halogen Derivatives of Alkanes',
  'Introduction to Polymer Chemistry', 'Modern Periodic Table', 'Solid State',
  'Solutions and Colligative Properties', 'Some Basic Concepts of Chemistry', 'Structure of Atom',
  'Surface Chemistry', 'Transition and Inner Transition Elements',
]
const MATHS_CHAPTERS = [
  'Vectors', 'Applications of Definite Integral', 'Applications of Derivative', 'Binomial Distribution',
  'Circle', 'Complex Numbers', 'Determinants and Matrices', 'Differential Equations', 'Differentiation',
  'Integration', 'Limits', 'Line and Plane', 'Linear Programming', 'Mathematical Logic',
  'Measures of Dispersion', 'Pair of Straight Lines', 'Permutations and Combinations',
  'Probability Distribution', 'Sets, Relations and Functions', 'Straight Line',
  'Trigonometric Functions', 'Trigonometry - I', 'Trigonometry - II',
]

function buildMockChapters() {
  const subjects = [
    { id: 'subj-physics', name: 'Physics', chapters: PHYSICS_CHAPTERS },
    { id: 'subj-chemistry', name: 'Chemistry', chapters: CHEMISTRY_CHAPTERS },
    { id: 'subj-maths', name: 'Maths', chapters: MATHS_CHAPTERS },
  ]
  return subjects.flatMap(({ id: subjectId, name: subjectName, chapters }) =>
    chapters.map((name, i) => ({
      id: `ch-${subjectName.toLowerCase()}-${i}`,
      name,
      subjectId,
      orderIndex: i + 1,
      subject: { id: subjectId, name: subjectName },
    }))
  )
}

vi.mock('@/lib/db', () => ({
  db: {
    chapter: {
      findMany: vi.fn().mockResolvedValue(buildMockChapters()),
    },
    subject: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'subj-physics', name: 'Physics' },
        { id: 'subj-chemistry', name: 'Chemistry' },
        { id: 'subj-maths', name: 'Maths' },
      ]),
    },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const XLSX_PATH = path.resolve('C:/Vilas/LWS_Pune/MHT-CET/MHT_CET_2024_May14_Shift2.xlsx')

function makeXlsxFile(name = 'MHT_CET_2024_May14_Shift2.xlsx'): File {
  const buf = fs.readFileSync(XLSX_PATH)
  return new File([buf], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function makeRequest(file: File): NextRequest {
  const fd = new FormData()
  fd.append('file', file)
  return new NextRequest('http://localhost/api/mocks/import/parse', { method: 'POST', body: fd })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/mocks/import/parse', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../parse/route')
    POST = mod.POST
  })

  // ── validation ────────────────────────────────────────────────────────────

  it('returns 400 when no file is attached', async () => {
    const req = new NextRequest('http://localhost/api/mocks/import/parse', {
      method: 'POST',
      body: new FormData(),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/no file/i)
  })

  it('returns 400 for a non-xlsx extension', async () => {
    const fd = new FormData()
    fd.append('file', new File(['data'], 'questions.csv', { type: 'text/csv' }))
    const req = new NextRequest('http://localhost/api/mocks/import/parse', { method: 'POST', body: fd })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/\.xlsx/i)
  })

  it('returns 400 when a required column is missing', async () => {
    // Build a minimal xlsx with one column missing
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
      // Missing 'Solution' column
      ['Q', 'Subject', 'Course', 'Chapter', 'Subtopic', 'Question Context',
        'Question', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'Answer', 'Difficulty Level'],
      [1, 'Physics', 'MHT-CET', 'Gravitation', '', null, 'Q text', 'A', 'B', 'C', 'D', 'A', 'Easy'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fd = new FormData()
    fd.append('file', new File([buf], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const req = new NextRequest('http://localhost/api/mocks/import/parse', { method: 'POST', body: fd })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/missing column/i)
  })

  // ── happy path with real xlsx ─────────────────────────────────────────────

  it('returns 200 and all three subjects from the real xlsx', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    expect(res.status).toBe(200)
    const body = (await res.json()) as ParseResponse
    expect(body.subjects.map((s) => s.subjectKey)).toEqual(['Physics', 'Chemistry', 'Maths'])
  })

  it('returns correct filename in response', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    expect(body.filename).toBe('MHT_CET_2024_May14_Shift2.xlsx')
  })

  it('parses 50 non-skipped questions for Physics and Maths', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse

    const physics = body.subjects.find((s) => s.subjectKey === 'Physics')!
    const maths = body.subjects.find((s) => s.subjectKey === 'Maths')!

    expect(physics.questions).toHaveLength(50)
    expect(maths.questions).toHaveLength(50)
  })

  it('keeps all 50 Chemistry questions (cross-resolved ones are kept, not skipped)', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const chemistry = body.subjects.find((s) => s.subjectKey === 'Chemistry')!

    // Cross-resolved questions are kept with the resolved chapterId — teacher decides Keep/Skip in the UI
    expect(chemistry.questions).toHaveLength(50)
  })

  it('converts \\(...\\) inline LaTeX to $...$', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const physics = body.subjects.find((s) => s.subjectKey === 'Physics')!
    const q1 = physics.questions[0]

    // Original Q1: "The self induction \(L\) produced by solenoid..."
    expect(q1.text).toContain('$L$')
    expect(q1.text).not.toContain('\\(')
    expect(q1.text).not.toContain('\\)')
  })

  it('converts \\[...\\] block LaTeX to $$...$$', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse

    const allText = body.subjects
      .flatMap((s) => s.questions.flatMap((q) => [q.text, ...q.options, q.solution ?? '']))
      .join('\n')

    // No unconverted delimiters remain anywhere
    expect(allText).not.toContain('\\(')
    expect(allText).not.toContain('\\)')
    expect(allText).not.toContain('\\[')
    expect(allText).not.toContain('\\]')
  })

  it('maps answer letter C to correctIndex 2 for Q1 (Physics)', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const physics = body.subjects.find((s) => s.subjectKey === 'Physics')!
    expect(physics.questions[0].correctIndex).toBe(2) // Q1 answer is C
  })

  it('gives each question exactly 4 options', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    for (const subject of body.subjects) {
      for (const q of subject.questions) {
        expect(q.options, `Q${q.rowNum} should have 4 options`).toHaveLength(4)
      }
    }
  })

  it('populates solution text on questions', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const physics = body.subjects.find((s) => s.subjectKey === 'Physics')!
    expect(physics.questions[0].solution).toBeTruthy()
  })

  it('populates subtopicName from the Subtopic column', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const physics = body.subjects.find((s) => s.subjectKey === 'Physics')!
    // subtopicName must be a non-empty string (or null) — never an empty string
    for (const q of physics.questions) {
      expect(q.subtopicName === null || (typeof q.subtopicName === 'string' && q.subtopicName.length > 0)).toBe(true)
    }
    // Q1 Physics should have a subtopic
    expect(physics.questions[0].subtopicName).toBeTruthy()
  })

  it('emits a chapter_cross_resolved warning for Chemistry row with Magnetic Materials chapter', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const chemistry = body.subjects.find((s) => s.subjectKey === 'Chemistry')!

    const crossWarnings = chemistry.warnings.filter((w) => w.type === 'chapter_cross_resolved')
    expect(crossWarnings).toHaveLength(1)
    expect(crossWarnings[0].message).toContain('Magnetic Materials')
    expect(crossWarnings[0].message).toContain('Physics')
  })

  it('cross-resolved question uses the Physics chapterId', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const chemistry = body.subjects.find((s) => s.subjectKey === 'Chemistry')!

    const crossWarning = chemistry.warnings.find((w) => w.type === 'chapter_cross_resolved')!
    // The question with that tempId should have resolvedSubjectKey = 'Physics'
    const q = chemistry.questions.find((q) => q.tempId === crossWarning.tempId)!
    expect(q.resolvedSubjectKey).toBe('Physics')
    expect(q.chapterName).toBe('Magnetic Materials')
  })

  it('auto-derives titles from filename, one per subject', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    for (const s of body.subjects) {
      expect(s.suggestedTitle).toContain(s.subjectKey)
      expect(s.suggestedTitle).toMatch(/MHT CET 2024 May14 Shift2/)
    }
  })

  it('replaces empty options with a — placeholder (Q117 Maths/Limits has blank OptionC in source)', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    const maths = body.subjects.find((s) => s.subjectKey === 'Maths')!
    // Q117 is questions[16] (0-indexed) in Maths; OptionC (index 2) is blank in the source Excel
    const q117 = maths.questions[16]
    expect(q117.options[2]).toBe('—')
    expect(q117.options[0]).not.toBe('—') // others should have real content
  })

  it('returns subjects in Physics → Chemistry → Maths order', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    expect(body.subjects.map((s) => s.subjectKey)).toEqual(['Physics', 'Chemistry', 'Maths'])
  })

  it('sets pyqYear to null when PYQ column is absent (legacy xlsx)', async () => {
    const res = await POST(makeRequest(makeXlsxFile()))
    const body = (await res.json()) as ParseResponse
    for (const subject of body.subjects) {
      for (const q of subject.questions) {
        expect(q.pyqYear).toBeNull()
      }
    }
  })

  it('reads pyqYear from PYQ column when present', async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
      ['Q', 'Subject', 'Course', 'Chapter', 'Subtopic', 'Question Context',
        'Question', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'Answer', 'Solution', 'Difficulty Level', 'PYQ'],
      [1, 'Physics', 'MHT-CET', 'Gravitation', 'Escape Velocity', null, 'What is $g$?', 'A', 'B', 'C', 'D', 'A', 'Solution text', 'Easy', '2021'],
      [2, 'Physics', 'MHT-CET', 'Gravitation', '', null, 'What is $G$?', 'A', 'B', 'C', 'D', 'B', 'Solution text', 'Easy', ''],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fd = new FormData()
    fd.append('file', new File([buf], 'test_pyq.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const req = new NextRequest('http://localhost/api/mocks/import/parse', { method: 'POST', body: fd })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as ParseResponse
    const physics = body.subjects.find((s) => s.subjectKey === 'Physics')!
    expect(physics.questions[0].pyqYear).toBe('2021')  // row with '2021'
    expect(physics.questions[1].pyqYear).toBeNull()    // row with empty string → null
  })
})
