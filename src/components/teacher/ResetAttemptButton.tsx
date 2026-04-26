'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  attemptId: string
}

export default function ResetAttemptButton({ attemptId }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Reset failed')
      toast.success('Attempt reset — student can reattempt')
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
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive focus-visible:ring-destructive"
        onClick={() => setConfirming(true)}
      >
        Reset
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-destructive font-medium">Delete this attempt?</span>
      <Button variant="destructive" size="sm" disabled={loading} onClick={handleReset}>
        {loading ? '…' : 'Yes'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
        No
      </Button>
    </div>
  )
}
