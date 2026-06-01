import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../db/client'
import { verifyJWT } from '../middleware/auth'

const router = Router()
router.use(verifyJWT)

const SettingsSchema = z.object({
  kcal_target: z.number().int().positive(),
  protein_target: z.number().int().positive(),
  fat_target: z.number().int().positive(),
  carbs_target: z.number().int().positive(),
})

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', req.userId)
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  if (!data) {
    // Return defaults if no settings row exists yet
    res.json({
      user_id: req.userId,
      kcal_target: 2000,
      protein_target: 150,
      fat_target: 70,
      carbs_target: 250,
    })
    return
  }

  res.json(data)
})

router.put('/', async (req, res) => {
  const body = SettingsSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten().fieldErrors })
    return
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: req.userId, ...body.data })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json(data)
})

export default router
