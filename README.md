# Iris_cal

AI-powered calorie and nutrition tracking PWA with Claude vision analysis.

## Tech stack

- **Client:** React 18, Vite, Tailwind CSS, TanStack Query v5, React Router v6, PWA
- **Server:** Express, TypeScript, Supabase (PostgreSQL), Claude AI vision
- **Deploy:** Vercel (frontend + API serverless functions)

## Setup

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**
3. Copy your **Project URL** and **service_role** key from Project Settings → API

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service_role secret key
- `JWT_SECRET` — any long random string (≥32 chars)
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `USER1_*` / `USER2_*` — the two users to seed

Also create the client env file:

```bash
echo "VITE_API_URL=http://localhost:3001/api" > client/.env.local
```

### 3. Install dependencies

```bash
npm install
```

### 4. Seed users

```bash
npm run seed
```

### 5. Generate PWA icons

```bash
npm run generate-icons
```

### 6. Start development

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Deploy to Vercel

1. Push the repo to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Set all environment variables from `.env` in the Vercel dashboard
4. Set `VITE_API_URL` = `https://your-app.vercel.app/api`
5. Set `CLIENT_ORIGIN` = `https://your-app.vercel.app`
6. Deploy — Vercel auto-builds the client and deploys the `api/` serverless function

## Project structure

```
iris-cal/
├── api/index.ts          # Vercel serverless entry (wraps Express)
├── client/               # React PWA
├── server/               # Express API (Supabase + Claude)
├── supabase/schema.sql   # Run once in Supabase SQL Editor
├── scripts/              # Icon generation
├── vercel.json           # Vercel build config
└── .env.example
```

## API routes (all prefixed `/api`)

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Get JWT token |
| GET | /meals?date=YYYY-MM-DD | Meals for a day |
| POST | /meals/analyse | AI image analysis |
| POST | /meals | Save meal |
| PATCH | /meals/:id | Update meal |
| DELETE | /meals/:id | Delete meal |
| GET | /meals/history?from=&to= | Date range summary |
| GET | /settings | Get daily targets |
| PUT | /settings | Update daily targets |
