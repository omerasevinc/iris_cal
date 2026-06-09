import { Router } from 'express'
import { supabase } from '../db/client'
import { verifyJWT } from '../middleware/auth'

const router = Router()
router.use(verifyJWT)

// GET /api/social/today — all users' today totals + targets
router.get('/today', async (_req, res) => {
  const todayISO = new Date().toISOString().substring(0, 10)

  const [usersResult, mealsResult, settingsResult] = await Promise.all([
    supabase.from('users').select('id, name'),
    supabase
      .from('meal_logs')
      .select('user_id, total_kcal, total_protein_g, total_fat_g, total_carbs_g')
      .gte('logged_at', `${todayISO}T00:00:00.000Z`)
      .lte('logged_at', `${todayISO}T23:59:59.999Z`),
    supabase
      .from('user_settings')
      .select('user_id, kcal_target, protein_target, fat_target, carbs_target'),
  ])

  if (usersResult.error) {
    res.status(500).json({ error: usersResult.error.message })
    return
  }

  const mealsByUser = new Map<number, { kcal: number; protein: number; fat: number; carbs: number }>()
  for (const row of mealsResult.data ?? []) {
    const uid = row.user_id as number
    const prev = mealsByUser.get(uid) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    mealsByUser.set(uid, {
      kcal: prev.kcal + (row.total_kcal as number),
      protein: prev.protein + (row.total_protein_g as number),
      fat: prev.fat + (row.total_fat_g as number),
      carbs: prev.carbs + (row.total_carbs_g as number),
    })
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
    const totals = mealsByUser.get(u.id as number) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    const settings = settingsByUser.get(u.id as number) ?? {
      kcal_target: 2000,
      protein_target: 150,
      fat_target: 70,
      carbs_target: 250,
    }
    return {
      user_id: u.id,
      name: u.name,
      total_kcal: Math.round(totals.kcal),
      total_protein_g: Math.round(totals.protein),
      total_fat_g: Math.round(totals.fat),
      total_carbs_g: Math.round(totals.carbs),
      kcal_target: settings.kcal_target,
      protein_target: settings.protein_target,
      fat_target: settings.fat_target,
      carbs_target: settings.carbs_target,
    }
  })

  res.json(result)
})

export default router
