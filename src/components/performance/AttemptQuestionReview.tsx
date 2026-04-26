'use client'

import { useState } from 'react'
import KatexRenderer from '@/components/math/KatexRenderer'
import type { ReviewQuestion } from '@/types'

interface Props {
  questions: ReviewQuestion[]
}

export default function AttemptQuestionReview({ questions }: Props) {
  if (questions.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No questions in this category.</p>
  }

  return (
    <div className="flex flex-col gap-4 py-3">
      {questions.map((q, idx) => (
        <QuestionCard key={q.questionId} question={q} index={idx + 1} />
      ))}
    </div>
  )
}

function QuestionCard({ question, index }: { question: ReviewQuestion; index: number }) {
  const [showSolution, setShowSolution] = useState(false)

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Q{index}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {question.chapterName}
        </span>
        {question.isCorrect === true && (
          <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Correct
          </span>
        )}
        {question.isCorrect === false && (
          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Wrong
          </span>
        )}
        {question.isCorrect === null && (
          <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            Unattempted
          </span>
        )}
      </div>

      {/* Question text */}
      <div className="mb-3 leading-relaxed">
        <KatexRenderer text={question.questionText} />
      </div>

      {/* Question image */}
      {question.questionImageUrl && (
        <img
          src={question.questionImageUrl}
          alt="Question diagram"
          className="mb-3 max-h-48 rounded object-contain"
        />
      )}

      {/* Options */}
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSelected = opt.id === question.selectedOptionId
          const isAnswer = opt.isAnswer

          let optClass = 'rounded border px-3 py-2 '
          if (isAnswer && isSelected) {
            optClass += 'border-green-400 bg-green-50 text-green-900'
          } else if (isAnswer) {
            optClass += 'border-green-400 bg-green-50 text-green-900'
          } else if (isSelected) {
            optClass += 'border-red-400 bg-red-50 text-red-900'
          } else {
            optClass += 'border-border bg-background text-foreground'
          }

          return (
            <div key={opt.id} className={optClass}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {isAnswer && (
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isSelected && !isAnswer && (
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {!isSelected && !isAnswer && (
                    <span className="block h-4 w-4" />
                  )}
                </span>
                <KatexRenderer text={opt.text} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Solution */}
      {question.solution && (
        <div className="mt-3 border-t pt-3">
          <button
            onClick={() => setShowSolution((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showSolution ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {showSolution ? 'Hide solution' : 'Show solution'}
          </button>
          {showSolution && (
            <div className="mt-2 rounded bg-muted/50 px-3 py-2 text-muted-foreground leading-relaxed">
              <KatexRenderer text={question.solution} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
