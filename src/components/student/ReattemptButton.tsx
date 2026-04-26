'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  attemptId: string
  mockId: string
  previousScore: string
}

export default function ReattemptButton({ attemptId, mockId, previousScore }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReattempt = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to reset attempt')
      router.push(`/student/mocks/${mockId}/attempt`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <Button size="lg" className="flex-1" onClick={() => setConfirming(true)}>
        Reattempt
      </Button>
    )
  }

  return (
    <div className="flex-1 rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
      <p className="text-sm text-yellow-800 font-medium">
        Your previous score of <span className="font-bold">{previousScore}</span> will be permanently erased.
      </p>
      <div className="flex gap-3">
        <Button size="sm" disabled={loading} onClick={handleReattempt}>
          {loading ? 'Starting…' : 'Yes, reattempt'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
