-- Run this SQL in your Supabase SQL Editor to create the schema.
-- Dashboard → SQL Editor → New query → paste and run.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kcal_target INTEGER NOT NULL DEFAULT 2000,
  protein_target INTEGER NOT NULL DEFAULT 150,
  fat_target INTEGER NOT NULL DEFAULT 70,
  carbs_target INTEGER NOT NULL DEFAULT 250
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  meal_name TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total_kcal REAL NOT NULL,
  total_protein_g REAL NOT NULL,
  total_fat_g REAL NOT NULL,
  total_carbs_g REAL NOT NULL,
  ai_confidence TEXT,
  ai_notes TEXT
);

-- The server uses the service role key which bypasses RLS.
-- If you enable RLS later, add policies here.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs DISABLE ROW LEVEL SECURITY;
