'use client'

import { createContext, useContext, useState } from 'react'

type UIState = {
  targetPage: number
  setTargetPage: (page: number) => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
}

const UIStateContext = createContext<UIState | null>(null)

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [targetPage, setTargetPage] = useState(1)
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <UIStateContext.Provider value={{ targetPage, setTargetPage, chatOpen, setChatOpen }}>
      {children}
    </UIStateContext.Provider>
  )
}

export function useUIState() {
  const ctx = useContext(UIStateContext)
  if (!ctx) throw new Error('useUIState must be used within UIStateProvider')
  return ctx
}
