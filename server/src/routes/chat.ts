import { Router } from 'express'
import { z } from 'zod'
import { verifyJWT } from '../middleware/auth'
import { chat } from '../services/ai'

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

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
})

router.post('/', async (req, res) => {
  const body = ChatRequestSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten().fieldErrors })
    return
  }
  try {
    const result = await chat(body.data.messages)
    res.json(result)
  } catch (err) {
    res.status(422).json({ error: (err as Error).message })
  }
})

export default router
