import { describe, it, expect } from 'vitest'
import { computeContentHash } from '../hash'

const baseInput = {
  text: 'What is the value of $x$ when $y = 1$?',
  options: ['1', '2', '3', '4'],
  correctOptionLabel: 'A' as const,
}

describe('computeContentHash', () => {
  it('returns a 64-character lowercase hex string (sha256)', () => {
    const hash = computeContentHash(baseInput)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same input yields same hash', () => {
    expect(computeContentHash(baseInput)).toBe(computeContentHash(baseInput))
  })

  it('ignores leading/trailing whitespace in question text', () => {
    expect(computeContentHash({ ...baseInput, text: '   ' + baseInput.text + '   ' }))
      .toBe(computeContentHash(baseInput))
  })

  it('collapses runs of internal whitespace in question text', () => {
    expect(computeContentHash({ ...baseInput, text: 'What  is\tthe   value of $x$ when $y = 1$?' }))
      .toBe(computeContentHash({ ...baseInput, text: 'What is the value of $x$ when $y = 1$?' }))
  })

  it('is case-insensitive on question text', () => {
    expect(computeContentHash({ ...baseInput, text: baseInput.text.toUpperCase() }))
      .toBe(computeContentHash(baseInput))
  })

  it('is case-insensitive on option text', () => {
    expect(computeContentHash({ ...baseInput, options: ['ALPHA', 'BETA', 'GAMMA', 'DELTA'] }))
      .toBe(computeContentHash({ ...baseInput, options: ['alpha', 'beta', 'gamma', 'delta'] }))
  })

  it('is independent of option order when correct label is the same', () => {
    const a = computeContentHash({ ...baseInput, options: ['1', '2', '3', '4'], correctOptionLabel: 'A' })
    const b = computeContentHash({ ...baseInput, options: ['4', '3', '2', '1'], correctOptionLabel: 'A' })
    expect(a).toBe(b)
  })

  it('produces different hashes for different correct labels (same text + options)', () => {
    const a = computeContentHash({ ...baseInput, correctOptionLabel: 'A' })
    const b = computeContentHash({ ...baseInput, correctOptionLabel: 'B' })
    expect(a).not.toBe(b)
  })

  it('produces different hashes for different question text', () => {
    expect(computeContentHash({ ...baseInput, text: 'totally different question' }))
      .not.toBe(computeContentHash(baseInput))
  })

  it('produces different hashes when an option text changes', () => {
    expect(computeContentHash({ ...baseInput, options: ['1', '2', '3', '99'] }))
      .not.toBe(computeContentHash(baseInput))
  })
})
