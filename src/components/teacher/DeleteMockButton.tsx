'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  mockId: string
  mockTitle: string
}

export default function DeleteMockButton({ mockId, mockTitle }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/mocks/${mockId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      toast.success('Mock deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-destructive font-medium">Delete &ldquo;{mockTitle}&rdquo;? This cannot be undone.</span>
      <Button variant="destructive" size="sm" disabled={loading} onClick={handleDelete}>
        {loading ? 'Deleting…' : 'Yes, delete'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  )
}
