'use client'

import Image from 'next/image'
import KatexRenderer from '@/components/math/KatexRenderer'
import { cn } from '@/lib/utils'
import type { Question, Option } from '@/types'

interface Props {
  question: Question
  selectedOptionId: string | null
  isFlagged: boolean
  questionNumber: number
  onSelectOption: (optionId: string) => void
  onClearResponse: () => void
  onToggleFlag: () => void
  onNext: () => void
  onPrev: () => void
  isFirst: boolean
  isLast: boolean
}

export default function QuestionCard({
  question,
  selectedOptionId,
  isFlagged,
  questionNumber,
  onSelectOption,
  onClearResponse,
  onToggleFlag,
  onNext,
  onPrev,
  isFirst,
  isLast,
}: Props) {
  const options = question.options ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Question header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold">
            Q{questionNumber}
          </span>
          <span className="text-xs text-muted-foreground">
            +{question.marks} / -{question.negMarks}
          </span>
        </div>
        <button
          onClick={onToggleFlag}
          aria-label={isFlagged ? 'Remove flag' : 'Flag for review'}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium border transition-colors',
            isFlagged
              ? 'bg-purple-100 border-purple-300 text-purple-700'
              : 'bg-muted border-border text-muted-foreground hover:bg-accent'
          )}
        >
          {isFlagged ? '🚩 Flagged' : '⚑ Flag'}
        </button>
      </div>

      {/* Question text */}
      <div className="mb-4 rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed flex-shrink-0">
        <KatexRenderer text={question.text} />
        {question.imageUrl && (
          <div className="mt-3 relative max-h-48 overflow-hidden rounded">
            <Image
              src={question.imageUrl}
              alt="Question diagram"
              width={600}
              height={300}
              className="object-contain w-full"
            />
          </div>
        )}
      </div>

      {/* Options */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {options.map((option, idx) => (
          <OptionButton
            key={option.id}
            option={option}
            index={idx}
            selected={selectedOptionId === option.id}
            onSelect={() => onSelectOption(option.id)}
          />
        ))}
      </div>

      {/* Action bar */}
      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t flex-shrink-0">
        <button
          onClick={onClearResponse}
          disabled={!selectedOptionId}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear Response
        </button>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="rounded-md border px-4 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <button
            onClick={onNext}
            disabled={isLast}
            className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionButton({
  option,
  index,
  selected,
  onSelect,
}: {
  option: Option
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const labels = ['A', 'B', 'C', 'D']

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary/10 font-medium'
          : 'border-border hover:bg-accent hover:border-accent-foreground/20'
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {labels[index]}
      </span>
      <div className="flex-1 min-w-0">
        <KatexRenderer text={option.text} />
        {option.imageUrl && (
          <Image
            src={option.imageUrl}
            alt={`Option ${labels[index]}`}
            width={300}
            height={100}
            className="mt-2 object-contain max-h-24 rounded"
          />
        )}
      </div>
    </button>
  )
}
