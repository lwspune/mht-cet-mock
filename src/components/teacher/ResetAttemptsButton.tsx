'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  mockId: string
  attemptCount: number
}

export default function ResetAttemptsButton({ mockId, attemptCount }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mocks/${mockId}/attempts`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Reset failed')
      toast.success(`Cleared ${data.count} attempt(s)`)
      setConfirming(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirming(true)}
        disabled={attemptCount === 0}
      >
        Reset All Attempts ({attemptCount})
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-destructive font-medium">
        Delete all {attemptCount} student attempt(s)? This cannot be undone.
      </span>
      <Button variant="destructive" size="sm" disabled={loading} onClick={handleReset}>
        {loading ? 'Resetting…' : 'Yes, reset all'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  )
}
