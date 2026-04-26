'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import ImportMockDialog from './ImportMockDialog'

export default function ImportMockButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import Excel
      </Button>
      <ImportMockDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
