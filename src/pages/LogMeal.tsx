import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Edit3, Send, X } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { useAnalyseMeal, useSaveMeal, useChat } from '../hooks/useMeals'
import { EditMealModal } from '../components/EditMealModal'
import { usePendingMeal } from '../contexts/PendingMealContext'
import type {
  AnalysisResult,
  SaveMealBody,
  ChatMessage,
  ChatApiMessage,
  ChatContentBlock,
} from '../api'
import { BottomNav } from '../components/BottomNav'

interface StagedImage {
  previewUrl: string
  base64: string
  mime: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  file: File
}

function buildAnalysisSummaryText(r: AnalysisResult): string {
  const items = r.items.map((it) => `${it.name} (~${Math.round(it.kcal)} kcal)`).join(', ')
  const notes = r.notes ? `. Note: ${r.notes}` : ''
  return `I can see ${r.meal_name}. Total: ${Math.round(r.total_kcal)} kcal | ${Math.round(r.total_protein_g)}g protein | ${Math.round(r.total_fat_g)}g fat | ${Math.round(r.total_carbs_g)}g carbs. Items: ${items}. Confidence: ${r.confidence}${notes}.`
}

function buildChatHistory(messages: ChatMessage[]): ChatApiMessage[] {
  return messages
    .filter((m) => !m.isLoading && (m.text.trim() !== '' || m.imageBase64 != null))
    .map((m) => {
      const content: ChatContentBlock[] = []
      if (m.imageBase64 && m.imageMime) {
        const mime = m.imageMime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        content.push({ type: 'image', media_type: mime, data: m.imageBase64 })
      }
      if (m.text.trim()) content.push({ type: 'text', text: m.text })
      return { role: m.role, content }
    })
    .filter((m) => m.content.length > 0)
}

function ChatAnalysisCard({
  result,
  onLog,
}: {
  result: AnalysisResult
  onLog: () => void
}) {
  const confidenceClass =
    result.confidence === 'high'
      ? 'bg-green-100 text-green-700'
      : result.confidence === 'medium'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700'

  return (
    <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm p-4 max-w-xs">
      <p className="font-semibold text-teal-700 text-base mb-2">{result.meal_name}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        <span className="text-sm font-medium text-gray-800">
          {Math.round(result.total_kcal)} kcal
        </span>
        <span className="text-sm text-gray-500">P {Math.round(result.total_protein_g)}g</span>
        <span className="text-sm text-gray-500">F {Math.round(result.total_fat_g)}g</span>
        <span className="text-sm text-gray-500">C {Math.round(result.total_carbs_g)}g</span>
      </div>
      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${confidenceClass}`}>
        {result.confidence} confidence
      </span>
      {result.notes ? (
        <p className="text-xs text-gray-400 italic mb-3">{result.notes}</p>
      ) : null}
      <div className="flex gap-2 mt-1">
        <button
          onClick={onLog}
          className="flex-1 py-2 text-sm font-medium text-teal-600 border border-teal-300 rounded-xl hover:bg-teal-50 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onLog}
          className="flex-1 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors"
        >
          Log this meal
        </button>
      </div>
    </div>
  )
}

export function LogMeal() {
  const navigate = useNavigate()
  const { messages, setMessages, clearMessages } = usePendingMeal()
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputText, setInputText] = useState('')
  const [stagedImage, setStagedImage] = useState<StagedImage | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState<Partial<AnalysisResult> | null>(null)

  const analyse = useAnalyseMeal()
  const save = useSaveMeal()
  const chatMutation = useChat()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''

    setCompressing(true)
    setImageError(null)
    try {
      const compressed = (await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      })) as File

      const previewUrl = URL.createObjectURL(compressed)
      const arrayBuffer = await compressed.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      const chunks: string[] = []
      for (let i = 0; i < uint8.length; i += 8192) {
        chunks.push(String.fromCharCode(...uint8.subarray(i, i + 8192)))
      }
      const base64 = btoa(chunks.join(''))
      const mime = (compressed.type || 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp'

      setStagedImage({ previewUrl, base64, mime, file: compressed })
    } catch {
      setImageError('Could not process this image. Please try another.')
    } finally {
      setCompressing(false)
    }
  }

  async function handleSend() {
    const trimmed = inputText.trim()
    if (!stagedImage && !trimmed) return
    if (isLoading) return

    const userMsgId = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
    const loadingMsgId = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))

    if (stagedImage) {
      const newUserMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        text: trimmed,
        imagePreviewUrl: stagedImage.previewUrl,
        imageBase64: stagedImage.base64,
        imageMime: stagedImage.mime,
      }

      setMessages((prev) => [
        ...prev,
        newUserMsg,
        { id: loadingMsgId, role: 'assistant', text: '', isLoading: true },
      ])
      setInputText('')
      setStagedImage(null)

      const fileToAnalyse = stagedImage.file

      try {
        const result = await analyse.mutateAsync(fileToAnalyse)
        const summaryText = buildAnalysisSummaryText(result)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, isLoading: false, analysisResult: result, text: summaryText }
              : m,
          ),
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, isLoading: false, text: "Sorry, I couldn't analyse that image. Please try again." }
              : m,
          ),
        )
      }
    } else {
      const newUserMsg: ChatMessage = { id: userMsgId, role: 'user', text: trimmed }

      setMessages((prev) => [
        ...prev,
        newUserMsg,
        { id: loadingMsgId, role: 'assistant', text: '', isLoading: true },
      ])
      setInputText('')

      const history = buildChatHistory([...messages, newUserMsg])

      try {
        const result = await chatMutation.mutateAsync(history)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? {
                  ...m,
                  isLoading: false,
                  text: result.text,
                  ...(result.analysisResult ? { analysisResult: result.analysisResult } : {}),
                }
              : m,
          ),
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, isLoading: false, text: 'Something went wrong. Please try again.' }
              : m,
          ),
        )
      }
    }
  }

  function openManualEntry() {
    setModalData(null)
    setShowModal(true)
  }

  function openLogModal(result: AnalysisResult) {
    setModalData(result)
    setShowModal(true)
  }

  async function handleSave(data: SaveMealBody) {
    await save.mutateAsync({ ...data, logged_at: new Date().toISOString() })
    setShowModal(false)
    clearMessages()
    navigate('/dashboard', { replace: true })
  }

  const isLoading = analyse.isPending || chatMutation.isPending
  const canSend = (!!stagedImage || inputText.trim() !== '') && !isLoading && !compressing

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Log meal</h1>
        <button
          onClick={openManualEntry}
          className="flex items-center gap-1.5 text-teal-600 font-medium text-sm py-2 px-3 rounded-xl border border-teal-200 hover:bg-teal-50 transition-colors"
        >
          <Edit3 size={15} />
          Manual
        </button>
      </header>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 pt-16">
            <Camera size={48} className="mb-4 text-gray-300" />
            <p className="text-base font-medium text-gray-500">Take a photo of your meal</p>
            <p className="text-sm mt-1 text-gray-400">or ask me a nutrition question</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[75%]">
                {msg.imagePreviewUrl && (
                  <img
                    src={msg.imagePreviewUrl}
                    alt="Food photo"
                    className="w-48 h-48 object-cover rounded-2xl mb-1 ml-auto block"
                  />
                )}
                {msg.text && (
                  <div className="bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                    {msg.text}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[80%]">
                {msg.isLoading ? (
                  <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">
                      {analyse.isPending ? 'Analysing…' : 'Thinking…'}
                    </span>
                  </div>
                ) : msg.analysisResult ? (
                  <ChatAnalysisCard
                    result={msg.analysisResult}
                    onLog={() => openLogModal(msg.analysisResult!)}
                  />
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

      {/* Input bar */}
      <div
        className="shrink-0 bg-white border-t border-gray-100 px-3 pt-2 pb-2"
        style={{ marginBottom: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        {/* Staged image preview */}
        {stagedImage && (
          <div className="relative inline-block mb-2">
            <img
              src={stagedImage.previewUrl}
              alt="Selected photo"
              className="h-16 w-16 object-cover rounded-xl"
            />
            <button
              onClick={() => { setStagedImage(null); setImageError(null) }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {imageError && (
          <p className="text-xs text-red-500 mb-1">{imageError}</p>
        )}
        <div className="flex items-center gap-2">
          {/* Camera / compressing indicator */}
          <label
            htmlFor="chat-image"
            className={`shrink-0 p-2.5 rounded-xl bg-teal-50 text-teal-600 cursor-pointer hover:bg-teal-100 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px] ${compressing || isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {compressing ? (
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={22} />
            )}
            <input
              id="chat-image"
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
              disabled={compressing || isLoading}
            />
          </label>

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
            placeholder={stagedImage ? 'Add a message… (optional)' : 'Ask about your food…'}
            disabled={isLoading}
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 min-h-[44px]"
          />

          <button
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="shrink-0 p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {showModal && (
        <EditMealModal
          initial={modalData}
          onSave={(data) => void handleSave(data as SaveMealBody)}
          onClose={() => setShowModal(false)}
          isSaving={save.isPending}
        />
      )}

      <BottomNav />
    </div>
  )
}
