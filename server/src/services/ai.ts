import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const FoodItemSchema = z.object({
  name: z.string(),
  weight_g: z.number().nonnegative(),
  kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
})

const AiResponseSchema = z.object({
  meal_name: z.string(),
  items: z.array(FoodItemSchema).min(1),
  total_kcal: z.number().nonnegative(),
  total_protein_g: z.number().nonnegative(),
  total_fat_g: z.number().nonnegative(),
  total_carbs_g: z.number().nonnegative(),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string(),
})

export type AiResult = z.infer<typeof AiResponseSchema>

const SYSTEM_PROMPT = `You are a nutrition analysis assistant. Analyse the food in the image provided.
Return ONLY valid JSON, no markdown fences, no explanation, nothing else.
Use this exact shape:
{
  "meal_name": "short descriptive name",
  "items": [
    {
      "name": "food item name",
      "weight_g": 150,
      "kcal": 248,
      "protein_g": 46.2,
      "fat_g": 5.1,
      "carbs_g": 0
    }
  ],
  "total_kcal": 248,
  "total_protein_g": 46.2,
  "total_fat_g": 5.1,
  "total_carbs_g": 0,
  "confidence": "high",
  "notes": ""
}
Rules:
- confidence must be one of: "high", "medium", "low"
- Estimate portions from visual cues (plate size, utensils, context)
- List each distinct food item separately
- All numbers represent the estimated total portion shown, not per 100g
- notes: brief string about portion estimation uncertainty, or empty string`

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyseImage(buffer: Buffer, mimeType: string): Promise<AiResult> {
  const base64 = buffer.toString('base64')

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
  type AllowedMime = typeof allowedMimeTypes[number]
  const safeMime: AllowedMime = (allowedMimeTypes as readonly string[]).includes(mimeType)
    ? (mimeType as AllowedMime)
    : 'image/jpeg'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeMime, data: base64 },
          },
          { type: 'text', text: SYSTEM_PROMPT },
        ],
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI returned no text content')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    throw new Error(`AI returned invalid JSON: ${textBlock.text.slice(0, 200)}`)
  }

  const result = AiResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`AI response failed validation: ${result.error.message}`)
  }

  return result.data
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: ChatContentBlock[]
}

export interface ChatResponse {
  text: string
  analysisResult?: AiResult
}

const CHAT_SYSTEM_PROMPT = `You are a knowledgeable nutrition assistant in a calorie-tracking app.
The user may send food photos, ask follow-up questions about a previous analysis,
or ask general nutrition questions.

Guidelines:
- When shown a food photo, give a conversational analysis: identify the meal, estimate key macros (calories, protein, fat, carbs), note any uncertainty. Do NOT output raw JSON inline.
- When the user corrects the meal identification or says the portion was different, acknowledge the correction and recalculate with specific numbers.
- Keep responses concise — 2-5 sentences for simple follow-ups, a short paragraph for complex questions. Give concrete numbers rather than vague ranges.
- You are not responsible for saving meals — the app handles that separately.

IMPORTANT — Structured meal data:
Whenever you have identified a specific meal with enough confidence to log it (from a photo, from the user's correction, or from a text description), append a structured block at the very end of your response using EXACTLY this format (no spaces around the tags):
[MEAL_JSON]{"meal_name":"...","items":[{"name":"...","weight_g":0,"kcal":0,"protein_g":0,"fat_g":0,"carbs_g":0}],"total_kcal":0,"total_protein_g":0,"total_fat_g":0,"total_carbs_g":0,"confidence":"high","notes":""}[/MEAL_JSON]

Rules for the JSON block:
- confidence must be one of: "high", "medium", "low"
- All numbers represent the estimated portion shown, not per 100g
- notes: brief string about uncertainty, or empty string
- Omit the [MEAL_JSON] block entirely for general nutrition questions where no specific meal has been identified
- When the user corrects an incorrect identification or adjusts a portion size, you MUST include the [MEAL_JSON] block with the corrected values — even if you already provided an analysis earlier in the conversation`

// ─── Nutrition Chat ───────────────────────────────────────────────────────────

export interface MealContextItem {
  meal_name: string
  logged_at: string
  items: Array<{ name: string; kcal: number; protein_g: number; fat_g: number; carbs_g: number }>
  total_kcal: number
  total_protein_g: number
  total_fat_g: number
  total_carbs_g: number
}

export interface NutritionContext {
  meals: MealContextItem[]
  targets: {
    kcal_target: number
    protein_target: number
    fat_target: number
    carbs_target: number
  }
  totals: {
    kcal: number
    protein_g: number
    fat_g: number
    carbs_g: number
  }
}

function buildNutritionSystemPrompt(ctx: NutritionContext): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const { targets, totals, meals } = ctx
  const remaining = {
    kcal: Math.max(0, targets.kcal_target - totals.kcal),
    protein_g: Math.max(0, targets.protein_target - totals.protein_g),
    fat_g: Math.max(0, targets.fat_target - totals.fat_g),
    carbs_g: Math.max(0, targets.carbs_target - totals.carbs_g),
  }

  let mealSection = 'Bugün henüz öğün kaydedilmedi.'
  if (meals.length > 0) {
    mealSection = meals.map((m) => {
      const time = new Date(m.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      const itemLines = m.items.map((it) => `    - ${it.name}: ~${Math.round(it.kcal)} kcal, ${Math.round(it.protein_g)}g protein`).join('\n')
      return `  ${m.meal_name} (${time}):\n${itemLines}\n  Toplam: ${Math.round(m.total_kcal)} kcal | ${Math.round(m.total_protein_g)}g P | ${Math.round(m.total_fat_g)}g Y | ${Math.round(m.total_carbs_g)}g K`
    }).join('\n\n')
  }

  return `Sen bir kalori takip uygulamasında samimi ve bilgili bir beslenme koçu ve öğün kayıt asistanısın.
Kullanıcının yazdığı dilde yanıt ver (Türkçe veya İngilizce).
Bugün: ${dateStr}, saat ${timeStr}.

Kullanıcının günlük hedefleri:
  Kalori: ${targets.kcal_target} kcal
  Protein: ${targets.protein_target}g
  Yağ: ${targets.fat_target}g
  Karbonhidrat: ${targets.carbs_target}g

Bugün kaydedilen öğünler:
${mealSection}

Bugünkü toplamlar:
  Kalori: ${Math.round(totals.kcal)} / ${targets.kcal_target} kcal (${Math.round(remaining.kcal)} kaldı)
  Protein: ${Math.round(totals.protein_g)} / ${targets.protein_target}g (${Math.round(remaining.protein_g)}g kaldı)
  Yağ: ${Math.round(totals.fat_g)} / ${targets.fat_target}g (${Math.round(remaining.fat_g)}g kaldı)
  Karbonhidrat: ${Math.round(totals.carbs_g)} / ${targets.carbs_target}g (${Math.round(remaining.carbs_g)}g kaldı)

Genel kurallar:
- Sıcak ve teşvik edici ol
- Belirsiz tahminler değil, somut sayılar ver
- Kalan öğünler için net önerilerde bulun (örn. "150g tavuk + salata")
- Yanıtları özlü tut, liste/madde işareti kullan

Öğün kayıt talimatları:
- Kullanıcı yemek fotoğrafı gönderdiğinde veya yediği şeyi tarif ettiğinde, öğünü analiz et ve makroları tahmin et.
- Kullanıcı bir öğünü düzeltirse veya porsiyon farklıysa, yeni değerlerle yeniden hesapla.
- Yeterince güvenle tanımladığın her öğün için yanıtının SONUNA EXACTLY şu formatı ekle (etiketler arasında boşluk olmasın):
[MEAL_JSON]{"meal_name":"...","items":[{"name":"...","weight_g":0,"kcal":0,"protein_g":0,"fat_g":0,"carbs_g":0}],"total_kcal":0,"total_protein_g":0,"total_fat_g":0,"total_carbs_g":0,"confidence":"high","notes":""}[/MEAL_JSON]
- confidence: "high", "medium" veya "low" olmalı
- Tüm sayılar görünen porsiyon içindir, 100g başına değil
- Sadece genel beslenme sorularında [MEAL_JSON] bloğunu EKLEME`
}

export async function nutritionChat(ctx: NutritionContext, messages: ChatMessage[]): Promise<ChatResponse> {
  const systemPrompt = buildNutritionSystemPrompt(ctx)

  const sdkMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content.map((block) => {
      if (block.type === 'text') return { type: 'text' as const, text: block.text }
      return {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: block.media_type, data: block.data },
      }
    }),
  }))

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: sdkMessages,
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('AI returned no text content')

  const raw = textBlock.text
  const mealJsonMatch = raw.match(/\[MEAL_JSON\]([\s\S]*?)\[\/MEAL_JSON\]/)

  let text = raw
  let analysisResult: AiResult | undefined

  if (mealJsonMatch) {
    text = raw.replace(/\s*\[MEAL_JSON\][\s\S]*?\[\/MEAL_JSON\]/, '').trim()
    try {
      const parsed: unknown = JSON.parse(mealJsonMatch[1])
      const validated = AiResponseSchema.safeParse(parsed)
      if (validated.success) analysisResult = validated.data
    } catch {
      // malformed JSON — return text only
    }
  } else {
    // Truncated response: strip any dangling [MEAL_JSON] fragment so it doesn't show in chat
    text = raw.replace(/\s*\[MEAL_JSON\][\s\S]*$/, '').trim()
  }

  return analysisResult ? { text, analysisResult } : { text }
}

export async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  const sdkMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content.map((block) => {
      if (block.type === 'text') {
        return { type: 'text' as const, text: block.text }
      }
      return {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: block.media_type, data: block.data },
      }
    }),
  }))

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: CHAT_SYSTEM_PROMPT,
    messages: sdkMessages,
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI returned no text content')
  }

  const raw = textBlock.text
  const mealJsonMatch = raw.match(/\[MEAL_JSON\]([\s\S]*?)\[\/MEAL_JSON\]/)

  let text = raw
  let analysisResult: AiResult | undefined

  if (mealJsonMatch) {
    text = raw.replace(/\s*\[MEAL_JSON\][\s\S]*?\[\/MEAL_JSON\]/, '').trim()
    try {
      const parsed: unknown = JSON.parse(mealJsonMatch[1])
      const validated = AiResponseSchema.safeParse(parsed)
      if (validated.success) {
        analysisResult = validated.data
      }
    } catch {
      // malformed JSON — just ignore and return text only
    }
  } else {
    // Truncated response: strip any dangling [MEAL_JSON] fragment so it doesn't show in chat
    text = raw.replace(/\s*\[MEAL_JSON\][\s\S]*$/, '').trim()
  }

  return analysisResult ? { text, analysisResult } : { text }
}
