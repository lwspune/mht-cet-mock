'use client'

import { cn } from '@/lib/utils'
import type { QuestionState } from '@/types'

interface Props {
  total: number
  states: QuestionState[]
  current: number
  onSelect: (index: number) => void
}

const STATE_STYLES: Record<QuestionState, string> = {
  not_visited: 'bg-gray-400 text-white',
  not_answered: 'bg-red-500 text-white',
  answered: 'bg-green-500 text-white',
  flagged: 'bg-purple-500 text-white',
}

export default function QuestionNavigator({ total, states, current, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        {(Object.entries(STATE_STYLES) as [QuestionState, string][]).map(([state, style]) => (
          <div key={state} className="flex items-center gap-1.5">
            <span className={cn('h-4 w-4 rounded-sm flex-shrink-0', style)} />
            <span className="text-muted-foreground capitalize">{state.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            aria-label={`Question ${i + 1}: ${states[i] ?? 'not_visited'}`}
            className={cn(
              'h-8 w-full rounded text-xs font-semibold transition-all ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              STATE_STYLES[states[i] ?? 'not_visited'],
              current === i && 'ring-2 ring-offset-1 ring-foreground scale-110'
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Summary counts */}
      <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
        {(['answered', 'not_answered', 'flagged', 'not_visited'] as QuestionState[]).map((s) => (
          <div key={s} className="flex justify-between">
            <span className="capitalize text-muted-foreground">{s.replace('_', ' ')}</span>
            <span className="font-semibold">{states.filter((x) => x === s).length}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
