import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { useNutritionChat } from '../hooks/useMeals'
import { BottomNav } from '../components/BottomNav'
import type { NutritionChatMessage } from '../api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  isLoading?: boolean
}

function uid() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

interface Props {
  newMeal?: string
  onAnalysisTriggered?: () => void
  standalone?: boolean
}

export function NutritionChat({ newMeal, onAnalysisTriggered, standalone = false }: Props) {
  const location = useLocation()
  // When used as a standalone page, fall back to router state
  const resolvedNewMeal = newMeal ?? (standalone ? (location.state as { newMeal?: string } | null)?.newMeal ?? null : null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const didAutoTrigger = useRef(false)

  const chatMutation = useNutritionChat()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!resolvedNewMeal || didAutoTrigger.current) return
    didAutoTrigger.current = true
    onAnalysisTriggered?.()
    void triggerAnalysis(`Yeni öğün kaydettim: ${resolvedNewMeal}. Bugünkü durumumu analiz eder misin?`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function triggerAnalysis(triggerText: string) {
    const userMsg: ChatMessage = { id: uid(), role: 'user', text: triggerText }
    const loadingId = uid()

    setMessages([
      userMsg,
      { id: loadingId, role: 'assistant', text: '', isLoading: true },
    ])

    const apiMessages: NutritionChatMessage[] = [
      { role: 'user', content: [{ type: 'text', text: triggerText }] },
    ]

    try {
      const result = await chatMutation.mutateAsync(apiMessages)
      setMessages([
        userMsg,
        { id: loadingId, role: 'assistant', text: result.text },
      ])
    } catch {
      setMessages([
        userMsg,
        { id: loadingId, role: 'assistant', text: 'Bir hata oluştu. Lütfen tekrar dene.' },
      ])
    }
  }

  async function handleSend() {
    const trimmed = inputText.trim()
    if (!trimmed || chatMutation.isPending) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', text: trimmed }
    const loadingId = uid()

    const nextMessages = [...messages, userMsg]
    setMessages([...nextMessages, { id: loadingId, role: 'assistant', text: '', isLoading: true }])
    setInputText('')

    const apiMessages: NutritionChatMessage[] = nextMessages
      .filter((m) => !m.isLoading && m.text.trim())
      .map((m) => ({
        role: m.role,
        content: [{ type: 'text' as const, text: m.text }],
      }))

    try {
      const result = await chatMutation.mutateAsync(apiMessages)
      setMessages((prev) =>
        prev.map((m) => (m.id === loadingId ? { ...m, isLoading: false, text: result.text } : m))
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { ...m, isLoading: false, text: 'Bir hata oluştu. Lütfen tekrar dene.' } : m
        )
      )
    }
  }

  const inner = (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ paddingBottom: standalone ? 'calc(100px + env(safe-area-inset-bottom))' : '12px' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 pt-16">
            <MessageCircle size={48} className="mb-4 text-gray-300" />
            <p className="text-base font-medium text-gray-500">Beslenme koçun burada</p>
            <p className="text-sm mt-1 text-gray-400">Bugün ne yedin? Hedeflerine ne kadar yakınsın?</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[75%] bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[85%]">
                {msg.isLoading ? (
                  <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Analiz ediliyor…</span>
                  </div>
                ) : (
                  <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 whitespace-pre-wrap">
                    {msg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="shrink-0 bg-white border-t border-gray-100 px-3 pt-2 pb-2"
        style={standalone ? { marginBottom: 'calc(56px + env(safe-area-inset-bottom))' } : undefined}
      >
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Sohbeti temizle"
            >
              <Trash2 size={18} />
            </button>
          )}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Beslenme hakkında sor…"
            disabled={chatMutation.isPending}
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 min-h-[44px]"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!inputText.trim() || chatMutation.isPending}
            className="shrink-0 p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </>
  )

  if (!standalone) return <>{inner}</>

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold text-gray-900">AI Koç</h1>
      </header>
      {inner}
      <BottomNav />
    </div>
  )
}
