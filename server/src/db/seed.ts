import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../../.env') })

import bcrypt from 'bcryptjs'
import { supabase } from './client'

async function seed() {
  const { count, error: countErr } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  if (countErr) throw countErr

  if (count && count > 0) {
    console.log(`Users table already has ${count} row(s) — skipping seed.`)
    process.exit(0)
  }

  const users = [
    {
      name: process.env.USER1_NAME ?? 'User1',
      email: process.env.USER1_EMAIL ?? 'user1@example.com',
      password: process.env.USER1_PASSWORD ?? 'password123',
    },
    {
      name: process.env.USER2_NAME ?? 'User2',
      email: process.env.USER2_EMAIL ?? 'user2@example.com',
      password: process.env.USER2_PASSWORD ?? 'password456',
    },
  ]

  for (const u of users) {
    const password_hash = bcrypt.hashSync(u.password, 10)
    const { data: user, error: insertErr } = await supabase
      .from('users')
      .insert({ name: u.name, email: u.email, password_hash })
      .select()
      .single()

    if (insertErr || !user) throw insertErr ?? new Error('Insert failed')

    const { error: settingsErr } = await supabase
      .from('user_settings')
      .insert({ user_id: user.id })

    if (settingsErr) throw settingsErr

    console.log(`Created user: ${u.email}`)
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((e) => {
  console.error('Seed error:', e)
  process.exit(1)
})
