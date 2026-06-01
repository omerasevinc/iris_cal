import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { supabase } from '../db/client'
import { verifyJWT } from '../middleware/auth'
import { analyseImage } from '../services/ai'

const router = Router()
router.use(verifyJWT)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const FoodItemSchema = z.object({
  name: z.string(),
  weight_g: z.number().nonnegative(),
  kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
})

const SaveMealSchema = z.object({
  meal_name: z.string().min(1),
  items: z.array(FoodItemSchema).min(1),
  total_kcal: z.number().nonnegative(),
  total_protein_g: z.number().nonnegative(),
  total_fat_g: z.number().nonnegative(),
  total_carbs_g: z.number().nonnegative(),
  ai_confidence: z.string().optional(),
  ai_notes: z.string().optional(),
  logged_at: z.string().optional(),
})

function parseMeal(row: Record<string, unknown>) {
  const { items_json, ...rest } = row
  return { ...rest, items: JSON.parse(items_json as string) }
}

// GET /api/meals?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const date = req.query.date as string | undefined
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' })
    return
  }

  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', req.userId)
    .gte('logged_at', `${date}T00:00:00.000Z`)
    .lte('logged_at', `${date}T23:59:59.999Z`)
    .order('logged_at', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json(data.map(parseMeal))
})

// GET /api/meals/history?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/history', async (req, res) => {
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined

  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params required (YYYY-MM-DD)' })
    return
  }

  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', req.userId)
    .gte('logged_at', `${from}T00:00:00.000Z`)
    .lte('logged_at', `${to}T23:59:59.999Z`)
    .order('logged_at', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  // Group by calendar date
  const dayMap = new Map<
    string,
    { date: string; total_kcal: number; total_protein_g: number; total_fat_g: number; total_carbs_g: number; meals: ReturnType<typeof parseMeal>[] }
  >()

  for (const row of data) {
    const date = (row.logged_at as string).substring(0, 10)
    if (!dayMap.has(date)) {
      dayMap.set(date, { date, total_kcal: 0, total_protein_g: 0, total_fat_g: 0, total_carbs_g: 0, meals: [] })
    }
    const day = dayMap.get(date)!
    day.total_kcal += row.total_kcal as number
    day.total_protein_g += row.total_protein_g as number
    day.total_fat_g += row.total_fat_g as number
    day.total_carbs_g += row.total_carbs_g as number
    day.meals.push(parseMeal(row as Record<string, unknown>))
  }

  res.json(Array.from(dayMap.values()))
})

// POST /api/meals/analyse — analyse image, do NOT save
router.post('/analyse', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image uploaded (field name must be "image")' })
    return
  }

  try {
    const result = await analyseImage(req.file.buffer, req.file.mimetype)
    res.json(result)
  } catch (err) {
    res.status(422).json({ error: (err as Error).message })
  }
})

// POST /api/meals — save confirmed meal
router.post('/', async (req, res) => {
  const body = SaveMealSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten().fieldErrors })
    return
  }

  const { items, ai_confidence, ai_notes, logged_at, ...rest } = body.data

  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: req.userId,
      logged_at: logged_at ?? new Date().toISOString(),
      items_json: JSON.stringify(items),
      ai_confidence: ai_confidence ?? null,
      ai_notes: ai_notes ?? null,
      ...rest,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json(parseMeal(data as Record<string, unknown>))
})

// PATCH /api/meals/:id
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid meal id' })
    return
  }

  const UpdateSchema = SaveMealSchema.partial()
  const body = UpdateSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten().fieldErrors })
    return
  }

  const { items, ...rest } = body.data
  const patch: Record<string, unknown> = { ...rest }
  if (items !== undefined) patch.items_json = JSON.stringify(items)

  const { data, error } = await supabase
    .from('meal_logs')
    .update(patch)
    .eq('id', id)
    .eq('user_id', req.userId)
    .select()
    .single()

  if (error) {
    res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message })
    return
  }

  res.json(parseMeal(data as Record<string, unknown>))
})

// DELETE /api/meals/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid meal id' })
    return
  }

  const { error } = await supabase
    .from('meal_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', req.userId)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(204).send()
})

export default router
