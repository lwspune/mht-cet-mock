import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function calcScore(
  answers: Array<{ isCorrect: boolean | null; selectedOptionId: string | null }>,
  marksCorrect: number,
  marksWrong: number
): number {
  return answers.reduce((sum, a) => {
    if (a.isCorrect === true) return sum + marksCorrect
    if (a.isCorrect === false && a.selectedOptionId !== null) return sum - marksWrong
    return sum
  }, 0)
}
