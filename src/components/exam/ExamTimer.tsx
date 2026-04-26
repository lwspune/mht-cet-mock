'use client'

import { useEffect, useRef, useState } from 'react'
import { formatSeconds } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  initialSecs: number
  onExpire: () => void
}

export default function ExamTimer({ initialSecs, onExpire }: Props) {
  const [remaining, setRemaining] = useState(initialSecs)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current()
      return
    }

    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id)
          onExpireRef.current()
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, []) // only run once on mount

  const pct = (remaining / initialSecs) * 100
  const isWarning = pct <= 25
  const isDanger = pct <= 10

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-sm font-semibold tabular-nums',
        isDanger
          ? 'bg-red-100 text-red-700 animate-pulse'
          : isWarning
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-blue-50 text-blue-700'
      )}
      aria-label={`Time remaining: ${formatSeconds(remaining)}`}
      role="timer"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {formatSeconds(remaining)}
    </div>
  )
}
