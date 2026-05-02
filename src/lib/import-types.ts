// Shared types for the Excel import flow (parse → review → import)

export interface ParsedQuestion {
  tempId: string            // "row_N" — client uses this as React key and for skip decisions
  rowNum: number
  chapterName: string
  subtopicName: string | null
  resolvedSubjectKey: string // which subject's chapter table the chapterId comes from
  text: string              // LaTeX converted to $...$ / $$...$$
  options: string[]         // [A, B, C, D], LaTeX converted
  correctIndex: number      // 0–3
  solution: string | null
  pyqYear: string | null    // e.g. "2021"; null if not a PYQ or column absent
}

export interface ImportWarning {
  tempId: string
  rowNum: number
  type: 'chapter_cross_resolved' | 'chapter_not_found'
  message: string
}

export interface ParsedSubject {
  subjectId: string
  subjectKey: string         // "Physics" | "Chemistry" | "Maths"
  suggestedTitle: string
  questions: ParsedQuestion[]
  warnings: ImportWarning[]
}

export interface ParseResponse {
  subjects: ParsedSubject[]
  filename: string
}

// ---- Import request (client → server) ----

export interface ImportQuestion {
  tempId: string
  chapterName: string
  subtopicName: string | null
  resolvedSubjectKey: string
  text: string
  options: string[]
  correctIndex: number
  solution: string | null
  pyqYear: string | null
}

export interface ImportMockPayload {
  title: string
  subjectKey: string
  questions: ImportQuestion[]  // skipped ones already removed by client
}

export interface ImportRequest {
  durationMins: number
  marksCorrect: number
  marksWrong: number
  mocks: ImportMockPayload[]
}

export interface ImportResult {
  id: string
  title: string
  questionCount: number
}

export interface ImportResponse {
  mocks: ImportResult[]
}
