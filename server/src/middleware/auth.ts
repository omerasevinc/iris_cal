import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId: number
    }
  }
}

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
