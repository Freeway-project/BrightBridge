"use client"

import { useEffect, useState } from "react"
import { Meteors } from "@/components/ui/meteors"

export function ScreenMeteors() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 2600)
      return () => clearTimeout(t)
    }
    window.addEventListener("coursebridge:form-saved", handler)
    return () => window.removeEventListener("coursebridge:form-saved", handler)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-40 overflow-hidden pointer-events-none">
      <Meteors number={10} className="bg-cyan-300" />
      <Meteors number={10} className="bg-blue-400" />
      <Meteors number={8} className="bg-violet-500" />
      <Meteors number={8} className="bg-fuchsia-400" />
      <Meteors number={6} className="bg-emerald-300" />
      <Meteors number={6} className="bg-amber-300" />
    </div>
  )
}
