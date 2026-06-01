import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../db/client'
import { verifyJWT } from '../middleware/auth'
import { nutritionChat, type MealContextItem, type NutritionContext } from '../services/ai'

const router = Router()
router.use(verifyJWT)

const ChatContentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().min(1) }),
  z.object({
    type: z.literal('image'),
    media_type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    data: z.string().min(1),
  }),
])

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.array(ChatContentBlockSchema).min(1),
})

const RequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
})

router.post('/', async (req, res) => {
  const body = RequestSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten().fieldErrors })
    return
  }

  const todayISO = new Date().toISOString().substring(0, 10)

  const [mealsResult, settingsResult] = await Promise.all([
    supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', req.userId)
      .gte('logged_at', `${todayISO}T00:00:00.000Z`)
      .lte('logged_at', `${todayISO}T23:59:59.999Z`)
      .order('logged_at', { ascending: true }),
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle(),
  ])

  if (mealsResult.error) {
    res.status(500).json({ error: mealsResult.error.message })
    return
  }

  const settings = settingsResult.data ?? {
    kcal_target: 2000,
    protein_target: 150,
    fat_target: 70,
    carbs_target: 250,
  }

  const meals: MealContextItem[] = (mealsResult.data ?? []).map((row) => ({
    meal_name: row.meal_name as string,
    logged_at: row.logged_at as string,
    items: JSON.parse(row.items_json as string) as MealContextItem['items'],
    total_kcal: row.total_kcal as number,
    total_protein_g: row.total_protein_g as number,
    total_fat_g: row.total_fat_g as number,
    total_carbs_g: row.total_carbs_g as number,
  }))

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.total_kcal,
      protein_g: acc.protein_g + m.total_protein_g,
      fat_g: acc.fat_g + m.total_fat_g,
      carbs_g: acc.carbs_g + m.total_carbs_g,
    }),
    { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  )

  const ctx: NutritionContext = {
    meals,
    targets: {
      kcal_target: settings.kcal_target as number,
      protein_target: settings.protein_target as number,
      fat_target: settings.fat_target as number,
      carbs_target: settings.carbs_target as number,
    },
    totals,
  }

  try {
    const result = await nutritionChat(ctx, body.data.messages)
    res.json(result)
  } catch (err) {
    res.status(422).json({ error: (err as Error).message })
  }
})

export default router
