"use client"

import { createContext, useContext, useState } from "react"

interface ModalContextType {
  isChatOpen: boolean
  setIsChatOpen: (open: boolean) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <ModalContext.Provider value={{ isChatOpen, setIsChatOpen }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModalContext() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModalContext must be used within ModalProvider")
  }
  return context
}
