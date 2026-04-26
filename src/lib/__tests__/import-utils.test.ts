import { describe, it, expect } from 'vitest'
import { convertLatex, answerLetterToIndex, deriveTitleFromFilename } from '../import-utils'

// ── convertLatex ──────────────────────────────────────────────────────────────

describe('convertLatex', () => {
  it('converts \\(...\\) inline math to $...$', () => {
    expect(convertLatex('Find \\(x\\) such that')).toBe('Find $x$ such that')
  })

  it('converts \\[...\\] block math to $$...$$', () => {
    expect(convertLatex('\\[E = mc^2\\]')).toBe('$$E = mc^2$$')
  })

  it('converts multiple inline expressions in one string', () => {
    expect(convertLatex('\\(a\\) and \\(b\\)')).toBe('$a$ and $b$')
  })

  it('converts mixed inline and block in one string', () => {
    expect(convertLatex('Inline \\(x\\) and block \\[y\\]')).toBe('Inline $x$ and block $$y$$')
  })

  it('converts complex fraction expressions', () => {
    const input = '\\(L = \\frac{\\mu_0 N^2 A}{\\ell}\\)'
    expect(convertLatex(input)).toBe('$L = \\frac{\\mu_0 N^2 A}{\\ell}$')
  })

  it('leaves plain text unchanged', () => {
    expect(convertLatex('No LaTeX here')).toBe('No LaTeX here')
  })

  it('returns empty string for null', () => {
    expect(convertLatex(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(convertLatex(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(convertLatex('')).toBe('')
  })

  it('does not double-convert already-converted $...$ delimiters', () => {
    expect(convertLatex('$x$')).toBe('$x$')
  })

  it('returns empty string for a blank cell (empty string input)', () => {
    // Caller is responsible for replacing '' with a placeholder before DB write
    expect(convertLatex('')).toBe('')
  })
})

// ── answerLetterToIndex ───────────────────────────────────────────────────────

describe('answerLetterToIndex', () => {
  it('maps A to 0', () => expect(answerLetterToIndex('A')).toBe(0))
  it('maps B to 1', () => expect(answerLetterToIndex('B')).toBe(1))
  it('maps C to 2', () => expect(answerLetterToIndex('C')).toBe(2))
  it('maps D to 3', () => expect(answerLetterToIndex('D')).toBe(3))

  it('is case-insensitive', () => {
    expect(answerLetterToIndex('a')).toBe(0)
    expect(answerLetterToIndex('c')).toBe(2)
  })

  it('trims whitespace before mapping', () => {
    expect(answerLetterToIndex(' B ')).toBe(1)
  })

  it('returns undefined for invalid letters', () => {
    expect(answerLetterToIndex('E')).toBeUndefined()
    expect(answerLetterToIndex('')).toBeUndefined()
    expect(answerLetterToIndex('1')).toBeUndefined()
  })
})

// ── deriveTitleFromFilename ───────────────────────────────────────────────────

describe('deriveTitleFromFilename', () => {
  it('strips extension and replaces underscores with spaces', () => {
    expect(deriveTitleFromFilename('MHT_CET_2024_May14_Shift2.xlsx', 'Physics'))
      .toBe('MHT CET 2024 May14 Shift2 — Physics')
  })

  it('replaces hyphens with spaces', () => {
    expect(deriveTitleFromFilename('MHT-CET-2024.xlsx', 'Maths'))
      .toBe('MHT CET 2024 — Maths')
  })

  it('appends the subject after an em-dash', () => {
    const result = deriveTitleFromFilename('Test_Paper.xlsx', 'Chemistry')
    expect(result).toContain('— Chemistry')
  })

  it('handles filenames with no extension', () => {
    expect(deriveTitleFromFilename('Paper_1', 'Physics')).toBe('Paper 1 — Physics')
  })
})
