# Milify

A mobile-first, calm digital hub for preschools. QR codes open daily checklists, leaders see what's done in a single view, and parents receive messages translated into their own language. Plus a bilingual (SV/EN) marketing one-pager and an admin console.

- **Marketing** at `/` (Swedish) and `/en` (English) — alternating editorial layout.
- **Login** at `/login` — unified sign-in for admins and staff.
- **Staff hub** at `/h/<tenantToken>` — routines (RUT), follow-up (KLARA) and messages (LIV).
- **Checklist** at `/c/<checklistToken>` — the QR target. Tap-to-complete writes a `who/when` log entry.
- **Parent page** at `/p/<parentToken>` — read-only messages translated by DeepL.
- **Admin** at `/admin` — manage tenants, departments, users, checklists (with QR download), parent links.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Drizzle ORM + SQLite (`@libsql/client`) for zero-setup local persistence
- `next-intl` for the SV/EN marketing toggle
- `bcryptjs` for password hashing, signed HttpOnly session cookie
- `qrcode` for per-checklist QR code generation (SVG)
- DeepL API for automatic translation of parent messages (cached in DB)
- Fonts: Fraunces (display) + Manrope (UI)

## Getting started

```bash
npm install
cp .env.example .env
# edit .env:
#   DATABASE_URL=./milify.db
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000
#   SESSION_SECRET=<long random string, 32+ chars>
#   ADMIN_BOOTSTRAP_EMAIL=admin@example.com
#   ADMIN_BOOTSTRAP_PASSWORD=<temporary password, change later>
#   DEEPL_API_KEY=<optional — parent translation>
#   DEEPL_API_HOST=https://api-free.deepl.com   # or https://api.deepl.com for Pro
npm run dev
```

Open:

- http://localhost:3000 — marketing (Swedish), toggle to `/en`
- http://localhost:3000/login — sign in with the bootstrapped admin email/password
- `/admin` → create a preschool; starter checklists (opening, closing, fire safety, cleaning) are seeded
- Open a checklist's QR URL (`/c/<token>`) on your phone to use tap-to-complete

### First-admin bootstrap

On the first sign-in attempt, if the `users` table is empty and `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` are set, Milify creates the first platform admin automatically. Once a user exists, those env vars are ignored. You can remove them after the first successful login.

## Upgrading from the previous workshop-focused version

V1 is a full data-model reshape: SBA/SAM/Incidents are replaced by tenants → departments → users → checklists → tasks → task_completions → messages → parent_links. The SQLite schema is created fresh on boot, but only if the tables don't already exist. For the cleanest start after upgrading:

```powershell
# Windows PowerShell
Remove-Item .\milify.db -ErrorAction SilentlyContinue
```

```bash
# macOS / Linux
rm -f ./milify.db
```

Then restart the dev server. A fresh schema is created and your bootstrap admin is seeded on first sign-in.

## Project layout

```
app/
  [locale]/                Marketing (SV + EN)
  login/                   Unified sign-in
  h/[tenantToken]/         Staff hub: routines, follow-up, messages
  c/[checklistToken]/      QR target — tap to complete tasks
  p/[parentToken]/         Parent read-only messages (translated)
  admin/                   Admin console (tenants/departments/users/checklists/parents)
  api/                     Small helper routes (contact, logout)
db/                        Drizzle schema, SQLite client, starter checklists
lib/                       Auth, tokens, translate (DeepL), qr, period keys, rate limit
messages/                  SV/EN JSON for marketing
i18n.ts, middleware.ts     next-intl wiring (only /, /sv, /en are localised)
```

## Design system

- **Paper** `#F4F1EA` · **Ink** `#141519` · **Accent** `#14594A` (forest-teal) · **Alert** `#B24A1E`
- One display serif (Fraunces) + one neutral sans (Manrope). No Inter, no purple gradients.
- 12-column grid, `clamp()` typography, alternating `SplitSection` for the marketing page.

## Core user flow

1. Staff scans the QR on a checklist → `/c/<checklistToken>`
2. If not signed in → redirected to `/login?next=/c/<token>`
3. After login → tap a task → a `task_completions` row is inserted (user + timestamp + period key)
4. The staff landing and follow-up views update immediately

## Modules

- **RUT — Routines.** Per-checklist QR code. Frequency: daily / weekly / monthly / custom. Tap-to-complete writes who/when.
- **KLARA — Follow-up.** What's open right now, missed periods, full history. Filters by department and assigned user.
- **LIV — Communication.** Staff broadcast to all or one department. Parent-side is read-only via `/p/<token>`. DeepL translates per message into the parent's selected language; translations are cached in the DB.

## Moving to Postgres

The schema works unchanged on Postgres. Swap `db/client.ts` to `drizzle-orm/node-postgres` or Neon's driver, update `drizzle.config.ts` `dialect` to `"postgresql"`, and run `db:push`. The SQL in `initSchema` is SQLite-specific and can be removed once migrations are in place.

## Security notes (MVP)

- All QR-bearing URLs (`/c/`, `/p/`, `/h/`) carry 24-char unguessable tokens.
- Passwords stored as bcrypt hashes. Sessions are HMAC-signed cookie IDs backed by a `sessions` table.
- Staff hub and checklist pages enforce tenant membership on every request.
- Tap-to-complete is rate-limited per IP+token to prevent flooding the log.
- `/admin`, `/h/`, `/c/`, `/p/` and `/login` are blocked in `robots.ts`.

## What's intentionally out (future modules)

- **STREPITUS** (environmental sensors), SMS/email providers, push notifications, PDF export, parent self-service accounts, multi-admin RBAC beyond `admin`/`staff`.
