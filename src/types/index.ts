export type Role = 'STUDENT' | 'TEACHER'
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED'
export type QuestionState = 'not_visited' | 'not_answered' | 'answered' | 'flagged'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: Role
  createdBy?: string | null
  createdAt: Date
}

export interface Subject {
  id: string
  name: string
}

export interface Chapter {
  id: string
  subjectId: string
  name: string
  orderIndex: number
  subject?: Subject
}

export interface Mock {
  id: string
  title: string
  subjectId: string
  createdBy: string
  durationMins: number
  marksCorrect: number
  marksWrong: number
  isPublished: boolean
  createdAt: Date
  subject?: Subject
  _count?: { questions: number; attempts: number }
}

export interface Option {
  id: string
  questionId: string
  text: string
  imageUrl?: string | null
  isCorrect?: boolean // only visible to teacher / after submission
}

export interface Question {
  id: string
  mockId: string
  chapterId: string
  text: string
  imageUrl?: string | null
  orderIndex: number
  marks: number
  negMarks: number
  chapter?: Chapter
  options?: Option[]
}

export interface MockAttempt {
  id: string
  mockId: string
  studentId: string
  startedAt: Date
  submittedAt?: Date | null
  status: AttemptStatus
  score?: number | null
  maxScore?: number | null
  mock?: Mock
}

export interface AttemptAnswer {
  id: string
  attemptId: string
  questionId: string
  selectedOptionId?: string | null
  isCorrect?: boolean | null
  timeSpentSecs: number
  isFlagged: boolean
}

// Performance types
export interface ExamPerformance {
  attemptId: string
  mockTitle: string
  subjectName: string
  date: Date
  score: number
  maxScore: number
  accuracy: number
  attempted: number
  correct: number
  wrong: number
  unattempted: number
  durationMins: number
}

export interface ChapterPerformance {
  chapterId: string
  chapterName: string
  subjectName: string
  correct: number
  wrong: number
  unattempted: number
  total: number
}

export interface WrongAnswer {
  questionId: string
  questionText: string
  questionImageUrl?: string | null
  chapterName: string
  subjectName: string
  yourOptionText: string
  correctOptionText: string
  marks: number
  negMarks: number
}

export interface UnattemptedQuestion {
  questionId: string
  questionText: string
  questionImageUrl?: string | null
  chapterName: string
  subjectName: string
  mockTitle: string
}

// Exam session types (client-side)
export interface ExamSession {
  attemptId: string
  mockId: string
  questions: Question[]
  answers: Record<string, string | null>   // questionId → selectedOptionId
  flagged: Record<string, boolean>
  timeSpent: Record<string, number>        // questionId → seconds
  currentQuestionIndex: number
  remainingSecs: number
}
