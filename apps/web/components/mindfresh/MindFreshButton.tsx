"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MindFreshModal } from "@/components/mindfresh/MindFreshModal"

export function MindFreshButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="pointer-events-none fixed right-5 bottom-5 z-40">
        <Button
          type="button"
          variant="vibrant"
          className="pointer-events-auto rounded-full px-4 py-2 text-xs normal-case tracking-normal shadow-xl from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="size-4" />
          Need 15 sec?
        </Button>
      </div>
      <MindFreshModal open={open} onOpenChange={setOpen} />
    </>
  )
}
