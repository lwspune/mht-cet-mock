'use client'

import React from 'react'
import { InlineMath, BlockMath } from 'react-katex'

interface Props {
  text: string
  className?: string
}

// Splits a string by $$...$$ (block) and $...$ (inline) LaTeX delimiters
// and renders each segment accordingly.
export default function KatexRenderer({ text, className }: Props) {
  if (!text) return null

  const segments = parseLatex(text)

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'block') {
          return (
            <BlockMath key={i} renderError={(err: Error) => <span className="text-red-500 text-xs">{err.message}</span>}>
              {seg.content}
            </BlockMath>
          )
        }
        if (seg.type === 'inline') {
          return (
            <InlineMath key={i} renderError={(err: Error) => <span className="text-red-500 text-xs">{err.message}</span>}>
              {seg.content}
            </InlineMath>
          )
        }
        // plain text — preserve whitespace/newlines
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{seg.content}</span>
      })}
    </span>
  )
}

type Segment = { type: 'text' | 'inline' | 'block'; content: string }

function parseLatex(input: string): Segment[] {
  const segments: Segment[] = []
  // Match $$...$$ first (greedy block), then $...$ (inline)
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: input.slice(lastIndex, match.index) })
    }

    const raw = match[0]
    if (raw.startsWith('$$')) {
      segments.push({ type: 'block', content: raw.slice(2, -2).trim() })
    } else {
      segments.push({ type: 'inline', content: raw.slice(1, -1).trim() })
    }

    lastIndex = match.index + raw.length
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', content: input.slice(lastIndex) })
  }

  return segments
}
