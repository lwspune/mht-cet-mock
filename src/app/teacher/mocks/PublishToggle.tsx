'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  mockId: string
  isPublished: boolean
}

export default function PublishToggle({ mockId, isPublished: initial }: Props) {
  const [published, setPublished] = useState(initial)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    const res = await fetch(`/api/mocks/${mockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !published }),
    })

    setLoading(false)
    if (res.ok) {
      setPublished((p) => !p)
      toast.success(published ? 'Mock unpublished' : 'Mock published — students can now see it')
      router.refresh()
    } else {
      toast.error('Failed to update')
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-50 ${
        published
          ? 'border-red-300 text-red-600 hover:bg-red-50'
          : 'border-green-300 text-green-700 hover:bg-green-50'
      }`}
    >
      {loading ? '…' : published ? 'Unpublish' : 'Publish'}
    </button>
  )
}
