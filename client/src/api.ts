// ─── Shared types ────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface FoodItem {
  name: string
  weight_g: number
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export interface AnalysisResult {
  meal_name: string
  items: FoodItem[]
  total_kcal: number
  total_protein_g: number
  total_fat_g: number
  total_carbs_g: number
  confidence: 'high' | 'medium' | 'low'
  notes: string
}

export interface MealLog {
  id: number
  user_id: number
  logged_at: string
  meal_name: string
  items: FoodItem[]
  total_kcal: number
  total_protein_g: number
  total_fat_g: number
  total_carbs_g: number
  ai_confidence: string | null
  ai_notes: string | null
}

export interface DayHistory {
  date: string
  total_kcal: number
  total_protein_g: number
  total_fat_g: number
  total_carbs_g: number
  meals: MealLog[]
}

export interface UserSettings {
  user_id: number
  kcal_target: number
  protein_target: number
  fat_target: number
  carbs_target: number
}

export interface SaveMealBody {
  meal_name: string
  items: FoodItem[]
  total_kcal: number
  total_protein_g: number
  total_fat_g: number
  total_carbs_g: number
  ai_confidence?: string
  ai_notes?: string
  logged_at?: string
}

// ─── Chat types ──────────────────────────────────────────────────────────────

export type ChatContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string }

export interface ChatApiMessage {
  role: 'user' | 'assistant'
  content: ChatContentBlock[]
}

export interface ChatApiResponse {
  text: string
  analysisResult?: AnalysisResult
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  imagePreviewUrl?: string
  imageBase64?: string
  imageMime?: string
  analysisResult?: AnalysisResult
  isLoading?: boolean
}

export async function chatApi(messages: ChatApiMessage[]): Promise<ChatApiResponse> {
  return apiFetch<ChatApiResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}

// ─── Multi-user localStorage helpers ─────────────────────────────────────────

export function getActiveUserId(): number | null {
  const raw = localStorage.getItem('auth_active_user_id')
  return raw ? Number(raw) : null
}

export function setActiveUserId(id: number) {
  localStorage.setItem('auth_active_user_id', String(id))
}

export function getStoredToken(userId: number): string | null {
  return localStorage.getItem(`auth_token_${userId}`)
}

export function setStoredToken(userId: number, token: string) {
  localStorage.setItem(`auth_token_${userId}`, token)
}

export function getStoredUser(userId: number): AuthUser | null {
  const raw = localStorage.getItem(`auth_user_${userId}`)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(`auth_user_${user.id}`, JSON.stringify(user))
}

export function clearStoredUser(userId: number) {
  localStorage.removeItem(`auth_token_${userId}`)
  localStorage.removeItem(`auth_user_${userId}`)
}

export function getAllStoredUsers(): AuthUser[] {
  const users: AuthUser[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('auth_user_')) {
      try {
        const u = JSON.parse(localStorage.getItem(key)!)
        users.push(u as AuthUser)
      } catch {
        /* ignore */
      }
    }
  }
  return users
}

function getActiveToken(): string | null {
  const id = getActiveUserId()
  return id ? getStoredToken(id) : null
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL as string

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getActiveToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error((err as { error?: string }).error ?? 'Request failed')
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T
    }
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getActiveToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error((err as { error?: string }).error ?? 'Upload failed')
    }
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}
