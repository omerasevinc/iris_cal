import { createContext, useContext, useState } from 'react'
import type { ChatMessage } from '../api'

interface PendingMealCtx {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  clearMessages: () => void
}

const PendingMealContext = createContext<PendingMealCtx | null>(null)

export function PendingMealProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  return (
    <PendingMealContext.Provider value={{ messages, setMessages, clearMessages: () => setMessages([]) }}>
      {children}
    </PendingMealContext.Provider>
  )
}

export function usePendingMeal() {
  const ctx = useContext(PendingMealContext)
  if (!ctx) throw new Error('usePendingMeal must be used within PendingMealProvider')
  return ctx
}
