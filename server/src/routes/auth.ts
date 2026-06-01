import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { supabase } from '../db/client'

const router = Router()

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req, res) => {
  const body = LoginSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten().fieldErrors })
    return
  }

  const { email, password } = body.data

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, password_hash')
    .eq('email', email)
    .single()

  if (error || !user) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  )

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
})

export default router
