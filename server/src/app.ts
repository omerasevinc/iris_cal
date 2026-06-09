import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import mealsRouter from './routes/meals'
import settingsRouter from './routes/settings'
import chatRouter from './routes/chat'
import nutritionChatRouter from './routes/nutrition-chat'
import socialRouter from './routes/social'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? true,
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/meals', mealsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/chat', chatRouter)
app.use('/api/nutrition-chat', nutritionChatRouter)
app.use('/api/social', socialRouter)

export default app
