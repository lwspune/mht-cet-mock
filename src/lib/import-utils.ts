const ANSWER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }

/**
 * Converts LaTeX delimiters from \(...\) / \[...\] to $...$ / $$...$$
 * so strings are compatible with our KaTeX renderer.
 */
export function convertLatex(text: string | null | undefined): string {
  if (text == null) return ''
  // In JS replace(), '$$' is the escape sequence for a literal '$'.
  // To emit '$$' (two dollar signs), we need '$$$$'.
  return String(text)
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
}

/**
 * Maps answer letter (A–D) to 0-based option index.
 * Returns undefined for unrecognised letters.
 */
export function answerLetterToIndex(letter: string): number | undefined {
  return ANSWER_TO_INDEX[letter.trim().toUpperCase()]
}

/**
 * Derives a mock title from the xlsx filename + subject name.
 * e.g. "MHT_CET_2024_May14_Shift2.xlsx" + "Physics"
 *   → "MHT CET 2024 May14 Shift2 — Physics"
 */
export function deriveTitleFromFilename(filename: string, subject: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return `${base} — ${subject}`
}
