import { Router } from 'express'
import { supabase } from '../db/client'
import { verifyJWT } from '../middleware/auth'

const router = Router()
router.use(verifyJWT)

// GET /api/social/today — all users' today totals, targets, and meals
router.get('/today', async (_req, res) => {
  const todayISO = new Date().toISOString().substring(0, 10)

  const [usersResult, mealsResult, settingsResult] = await Promise.all([
    supabase.from('users').select('id, name'),
    supabase
      .from('meal_logs')
      .select('id, user_id, meal_name, items_json, logged_at, total_kcal, total_protein_g, total_fat_g, total_carbs_g')
      .gte('logged_at', `${todayISO}T00:00:00.000Z`)
      .lte('logged_at', `${todayISO}T23:59:59.999Z`)
      .order('logged_at', { ascending: true }),
    supabase
      .from('user_settings')
      .select('user_id, kcal_target, protein_target, fat_target, carbs_target'),
  ])

  if (usersResult.error) {
    res.status(500).json({ error: usersResult.error.message })
    return
  }

  type MealRow = {
    id: number
    meal_name: string
    logged_at: string
    total_kcal: number
    total_protein_g: number
    total_fat_g: number
    total_carbs_g: number
    items: unknown[]
  }

  const mealsByUser = new Map<number, { kcal: number; protein: number; fat: number; carbs: number; meals: MealRow[] }>()
  for (const row of mealsResult.data ?? []) {
    const uid = row.user_id as number
    const prev = mealsByUser.get(uid) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0, meals: [] }
    prev.kcal += row.total_kcal as number
    prev.protein += row.total_protein_g as number
    prev.fat += row.total_fat_g as number
    prev.carbs += row.total_carbs_g as number
    prev.meals.push({
      id: row.id as number,
      meal_name: row.meal_name as string,
      logged_at: row.logged_at as string,
      total_kcal: row.total_kcal as number,
      total_protein_g: row.total_protein_g as number,
      total_fat_g: row.total_fat_g as number,
      total_carbs_g: row.total_carbs_g as number,
      items: JSON.parse(row.items_json as string) as unknown[],
    })
    mealsByUser.set(uid, prev)
  }

  const settingsByUser = new Map<number, { kcal_target: number; protein_target: number; fat_target: number; carbs_target: number }>()
  for (const row of settingsResult.data ?? []) {
    settingsByUser.set(row.user_id as number, {
      kcal_target: row.kcal_target as number,
      protein_target: row.protein_target as number,
      fat_target: row.fat_target as number,
      carbs_target: row.carbs_target as number,
    })
  }

  const result = (usersResult.data ?? []).map((u) => {
    const entry = mealsByUser.get(u.id as number) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0, meals: [] }
    const settings = settingsByUser.get(u.id as number) ?? {
      kcal_target: 2000,
      protein_target: 150,
      fat_target: 70,
      carbs_target: 250,
    }
    return {
      user_id: u.id,
      name: u.name,
      total_kcal: Math.round(entry.kcal),
      total_protein_g: Math.round(entry.protein),
      total_fat_g: Math.round(entry.fat),
      total_carbs_g: Math.round(entry.carbs),
      kcal_target: settings.kcal_target,
      protein_target: settings.protein_target,
      fat_target: settings.fat_target,
      carbs_target: settings.carbs_target,
      meals: entry.meals,
    }
  })

  res.json(result)
})

export default router
