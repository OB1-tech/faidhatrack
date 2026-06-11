# FaidhaTrack — Invoice Manager

A full-stack invoice management SaaS for Kenyan SMEs.

**Stack:** React + Vite + Tailwind · Supabase (Auth + DB) · Vercel (deployment)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run locally
npm run dev

# 3. Open http://localhost:5173
```

## Supabase Config
Already wired in `src/supabase.js`:
- **Project:** iueuqqivmtkjtueuivla (PFM2 repurposed)
- **Region:** eu-west-2

## Project Structure
```
src/
├── main.jsx          # Entry point
├── App.jsx           # Auth routing
├── supabase.js       # Supabase client
├── index.css         # Tailwind base
└── pages/
    ├── Auth.jsx      # Login / Signup
    └── Dashboard.jsx # Main dashboard (Supabase-wired)
```

## Features Built
- [x] Auth — Login, Signup, Google OAuth
- [x] Dashboard — Stats, Invoice Table, Chart, AI Insights panel
- [x] Create Invoice → saves to Supabase
- [x] Mark paid / Unmark
- [x] Delete invoice
- [x] Overdue alerts
- [ ] Clients page (Day 3)
- [ ] Payments page (Day 3)
- [ ] Claude AI Insights (Day 4)
- [ ] Vercel deployment (Day 4)

## Deploy to Vercel
```bash
npm install -g vercel
vercel
```
