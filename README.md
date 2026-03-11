# 🎮 Game Zone Management System
### React + Supabase SaaS Platform

A full-stack SaaS application for managing gaming centers with real authentication, database, and row-level security.

---

## 🚀 Quick Setup (15 minutes)

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Choose a name (e.g. `gamezone`) and a strong database password
4. Select your region → Click **"Create new project"**
5. Wait ~2 minutes for it to provision

---

### Step 2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open the file `supabase_schema.sql` from this project
4. Paste the entire contents into the SQL Editor
5. Click **"Run"** (green button)

This creates all tables, views, RLS policies, triggers, and seed data.

---

### Step 3 — Configure Environment Variables

1. In Supabase, go to **Project Settings → API**
2. Copy your **Project URL** and **anon/public key**
3. In this project folder, rename `.env.example` to `.env`
4. Fill in your values:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

### Step 4 — Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

### Step 5 — Create Your Super Admin Account

1. Open the app and click **"Register as Owner"**
2. Sign up with your email + password
3. Check your email and click the **confirmation link**
4. Go back to Supabase → **SQL Editor** and run:

```sql
UPDATE public.profiles
SET role = 'superadmin', status = 'active'
WHERE email = 'your@email.com';
```

5. Log in — you'll now have full Super Admin access!

---

## 📁 Project Structure

```
gamezone-supabase/
├── supabase_schema.sql     ← Run this in Supabase SQL Editor
├── .env.example            ← Copy to .env and fill in values
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx              ← All pages and UI
    ├── context/
    │   └── AuthContext.jsx  ← Auth state + session persistence
    ├── hooks/
    │   └── useSupabase.js   ← Data fetching hooks
    └── lib/
        └── supabase.js      ← Supabase client + all DB helpers
```

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | Extends auth.users — stores role, status, zone_id |
| `game_zones` | Gaming center locations |
| `subscription_plans` | Basic / Pro / Premium plan definitions |
| `subscriptions` | Zone → Plan assignments |
| `players` | Registered players per zone |
| `sessions` | Play sessions (start/end) |
| `payments` | Payment records per session |
| `notifications` | Platform announcements |
| `notification_reads` | Read receipts per user |

**Views:**
- `zone_analytics` — aggregated stats per zone
- `monthly_revenue` — revenue grouped by month

---

## 🔐 Row Level Security

All tables have RLS enabled with these rules:

| Role | Access |
|------|--------|
| **Super Admin** | Full read/write on all tables |
| **Owner** | Read/write only their zone's data |
| **Staff** | Read/write only their zone's operational data |
| **Suspended users** | Blocked at login, cannot access the system |

Security is enforced **server-side in PostgreSQL** — not just in the frontend.

---

## 👤 User Roles & Flow

```
Super Admin
  → Manages all zones, owners, players, subscriptions, reports

Owner
  → Manages their single zone: staff, players, sessions, earnings

Staff
  → Operational access: register players, start/end sessions, record payments
```

### Creating accounts:
- **Owners**: Register via the app → Admin approves by setting `status = 'active'`
- **Staff**: Register via the app → Owner assigns `zone_id` and sets `status = 'active'` via SQL or admin panel
- **Super Admin**: See Step 5 above

---

## ⚡ Real-time Features

The app uses **Supabase Realtime** for:
- Live session updates (new sessions appear instantly for staff)
- Live notification delivery (announcements push to all users)

---

## 🌐 Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel

# Set environment variables in Vercel dashboard:
# VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Deploy to Netlify

```bash
npm run build
# Upload the dist/ folder to Netlify
# Set env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

---

## 🔧 Common Issues

**"Missing Supabase env vars"**
→ Make sure `.env` file exists (not `.env.example`) with real values

**"User not found" after registration**
→ Check your email inbox and click the confirmation link

**"Permission denied" errors**
→ RLS is working correctly. Make sure user's `status = 'active'` in profiles table

**Charts show no data**
→ Add some players and sessions first — charts are live from the database

---

## 📊 Supabase Dashboard Tips

- **Authentication → Users**: See all registered users
- **Table Editor**: Browse and edit all data visually  
- **SQL Editor**: Run custom queries
- **Logs**: Debug auth and API issues
- **Storage**: Add file storage for avatars (optional extension)
