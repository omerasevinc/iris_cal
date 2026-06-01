import { createContext, useContext, useState, useEffect } from 'react'
import type { ChatMessage } from '../api'

const STORAGE_KEY = 'pending_meal_messages'

interface PendingMealCtx {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  clearMessages: () => void
}

const PendingMealContext = createContext<PendingMealCtx | null>(null)

function loadFromStorage(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const stored = JSON.parse(raw) as ChatMessage[]
    return stored.map((msg) => ({
      ...msg,
      // Blob URLs are invalid after reload — reconstruct from base64
      imagePreviewUrl:
        msg.imageBase64 && msg.imageMime
          ? `data:${msg.imageMime};base64,${msg.imageBase64}`
          : msg.imagePreviewUrl,
    }))
  } catch {
    return []
  }
}

export function PendingMealProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadFromStorage)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // storage quota exceeded or unavailable — ignore
    }
  }, [messages])

  function clearMessages() {
    setMessages([])
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return (
    <PendingMealContext.Provider value={{ messages, setMessages, clearMessages }}>
      {children}
    </PendingMealContext.Provider>
  )
}

export function usePendingMeal() {
  const ctx = useContext(PendingMealContext)
  if (!ctx) throw new Error('usePendingMeal must be used within PendingMealProvider')
  return ctx
}
