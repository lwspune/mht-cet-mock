import { createHash } from 'node:crypto'

export type CorrectOptionLabel = 'A' | 'B' | 'C' | 'D'

export interface ContentHashInput {
  text: string
  options: string[]
  correctOptionLabel: CorrectOptionLabel
}

/**
 * Stable content hash for a question, used to detect duplicates across mocks.
 *
 * Normalisation: trim outer whitespace, collapse internal whitespace runs to a
 * single space, lowercase. Option texts are normalised the same way and then
 * sorted, so re-ordering options does not change the hash. The correct option
 * label (A/B/C/D, the *original* author-assigned position) is appended after
 * the sort, so re-labelling correctness produces a different hash even though
 * the option content is identical.
 *
 * Mirror this exactly in any sibling project that needs cross-app dedup.
 */
export function computeContentHash({ text, options, correctOptionLabel }: ContentHashInput): string {
  const normText = normalise(text)
  const sortedOpts = options.map(normalise).sort()
  const payload = `${normText}|${sortedOpts.join('|')}|${correctOptionLabel}`
  return createHash('sha256').update(payload).digest('hex')
}

function normalise(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Convenience: compute hash from a list of options where one is marked correct.
 * The correct label is derived from the index of the option whose isCorrect is true.
 */
export function computeContentHashFromOptions(args: {
  text: string
  options: { text: string; isCorrect: boolean }[]
}): string {
  const correctIdx = args.options.findIndex((o) => o.isCorrect)
  if (correctIdx < 0 || correctIdx > 3) {
    throw new Error('computeContentHashFromOptions: exactly one option must be marked correct (index 0-3)')
  }
  return computeContentHash({
    text: args.text,
    options: args.options.map((o) => o.text),
    correctOptionLabel: (['A', 'B', 'C', 'D'] as const)[correctIdx],
  })
}
