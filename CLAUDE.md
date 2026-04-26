# MHT CET Mock Platform — Project Guide

## What This Is
Full-stack mock test platform for MHT CET (Physics, Chemistry, Maths only — no Biology).
Two roles: **Teacher** (creates mocks, manages students) and **Student** (attempts mocks, views performance).

## Development Preferences

### UI
- All student-facing screens must be mobile-first. Use Tailwind responsive prefixes (`sm:`, `md:`) and test layouts at 375px width. Touch targets must be at least 44px. Avoid horizontal scroll.

### Backend Integrity
- Enforce data rules at the DB level (FK, CHECK constraints, NOT NULL, triggers), not just in app code. Validate and reject bad input at the edge function boundary before any external API call (fail fast). Use transactions for multi-step writes. Return a consistent shape: `{ data }` on success, `{ error }` on failure. Keep all scoring and business logic server-side — never in client JS.

### Accessibility
- Use Tailwind `focus-visible:` utilities for focus styles on all interactive elements.

### Definition of Done
- Golden path must be verified in the browser at 375px width specifically.

### Security
- Validate and sanitize all user input at system boundaries. Avoid XSS — never use `dangerouslySetInnerHTML` with user-supplied content. Keep RLS enabled on all Supabase tables.

### Dependency Management
- Existing stack is React, Tailwind, and Supabase — exhaust these before adding a new package.

### Test Scope
- For edge functions, prefer integration tests over mocks.

### Function Size / Cohesion
- Each function or component should do one thing. If you need "and" to describe what it does, split it. Prefer small, named functions over large inline logic blocks.

### Performance
- Avoid N+1 queries — batch Supabase calls where possible. Avoid unnecessary React re-renders. Keep the bundle lean by code-splitting routes. Don't optimise prematurely — only when there is a measured problem.

## Tech Stack
- **Next.js 14** App Router, TypeScript, Vercel
- **Supabase** — Auth + Postgres + Storage (`question-images` bucket, public)
- **Prisma ORM** — direct URL for both runtime and migrations (see Env below)
- **Tailwind CSS** + Radix UI components (built manually in `src/components/ui/`, no shadcn CLI)
- **KaTeX** (`react-katex`) — `$...$` inline, `$$...$$` block
- **Recharts** — chapter-wise performance bar charts
- **React Hook Form + Zod** — all forms
- **Sonner** — toast notifications

## Route Structure
```
/                        → redirects to /teacher/dashboard or /student/dashboard based on role
/login                   → shared login page

/teacher/dashboard       → teacher home
/teacher/students        → student list + add student
/teacher/students/[id]/performance → view a student's performance
/teacher/mocks           → mock list (+ Import button)
/teacher/mocks/new       → create mock
/teacher/mocks/[id]/edit → edit mock + manage questions

/student/dashboard       → student home
/student/mocks           → browse published mocks
/student/mocks/[id]      → mock detail
/student/mocks/[id]/attempt → exam UI (timer, navigator, auto-save)
/student/performance     → 4-tab performance dashboard

/api/mocks/import/parse  → POST: upload .xlsx → returns preview JSON (ParseResponse)
/api/mocks/import        → POST: commits previewed mocks to DB (ImportRequest → ImportResponse)
```

## Auth Pattern — Critical
Two separate helpers in `src/lib/auth.ts`. **Never mix them up.**

| Context | Helper | On failure |
|---|---|---|
| Page / Layout (Server Component) | `requireRole('TEACHER')` | Next.js `redirect()` |
| API route | `apiRequireRole('TEACHER')` | Returns `NextResponse` 401/403 |

API routes must check: `if ('error' in auth) return auth.error`

## Database
Schema in `prisma/schema.prisma`. Key invariants:
- `User.id` === Supabase `auth.users.id` (UUID) — must match on creation
- `MockAttempt` is unique per `[mockId, studentId]` — one attempt per student per mock
- `AttemptAnswer.selectedOptionId = null` means unattempted (not wrong)
- Score: `+marksCorrect` (correct), `-marksWrong` (wrong + selected), `0` (null selectedOptionId)
- Performance data is derived from `attempt_answers` joined with `chapters` — no denormalized counters

After schema changes: `npx prisma db push` then `npx prisma generate`
> Local dev workaround: if VSCode holds the Prisma engine DLL, use `npx prisma generate --no-engine` to unblock. Do NOT use `--no-engine` in CI or production builds — it produces a client that requires a `prisma://` Accelerate URL.

## Creating Students (Teacher flow)
Students are created via Supabase Admin API, **not** self-signup:
1. `adminClient.auth.admin.createUser({ email_confirm: true })` — teacher sets password directly
2. `prisma.user.create({ id: supabaseUser.id, ... })` — same UUID
3. If Prisma fails, delete the auth user to rollback

`createAdminClient()` is in `src/lib/supabase/server.ts` — uses `SUPABASE_SERVICE_ROLE_KEY`, server-only.

## KaTeX Rendering
`src/components/math/KatexRenderer.tsx` — splits text by regex, renders inline/block/plain segments.
Use it anywhere question text or option text is displayed. Never render question text as raw string.

## Exam Attempt UI
`src/app/student/mocks/[id]/attempt/page.tsx` — client component:
- Starts or resumes an existing `IN_PROGRESS` attempt
- Auto-saves answers with 600ms debounce on every selection change
- Timer derived from `startedAt` (server-set) to prevent client manipulation
- On submit: flushes pending saves first, then calls `/api/attempts/[id]/submit`

## Env Variables
```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY       # Service role key — server only, never expose to client
DATABASE_URL                    # Direct Postgres URL (port 5432) — used at runtime
DIRECT_URL                      # Same as DATABASE_URL for this project
```
> The transaction pooler (port 6543) does not work with this project's credentials.
> Both `DATABASE_URL` and `DIRECT_URL` point to the direct connection.

## Dev Commands
```bash
npm run dev          # start dev server
npm run db:push      # push schema changes to Supabase
npm run db:seed      # seed subjects + chapters (idempotent upserts)
npx prisma studio    # browse DB in browser
npx vitest           # run all tests (55 tests across 3 suites)
npx vitest run       # run once (no watch mode)
```

## Key Files
| File | Purpose |
|---|---|
| `src/lib/auth.ts` | Auth helpers (see Auth Pattern above) |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/performance.ts` | 4 query functions for performance tabs |
| `src/lib/supabase/server.ts` | `createClient()` + `createAdminClient()` |
| `src/middleware.ts` | Session refresh on every request |
| `src/components/math/KatexRenderer.tsx` | KaTeX renderer |
| `src/components/teacher/QuestionEditor.tsx` | Question add/edit with live KaTeX preview + image upload |
| `src/components/teacher/AddStudentDialog.tsx` | Add student modal |
| `src/components/teacher/ImportMockButton.tsx` | Client wrapper that opens the import dialog |
| `src/components/teacher/ImportMockDialog.tsx` | 4-step import dialog: upload → review → importing → done |
| `src/lib/import-types.ts` | Shared types: `ParsedQuestion`, `ParseResponse`, `ImportRequest`, `ImportResponse` |
| `src/lib/import-utils.ts` | Pure helpers: `convertLatex`, `answerLetterToIndex`, `deriveTitleFromFilename` |
| `src/app/api/mocks/import/parse/route.ts` | xlsx parse API — reads file, resolves chapters, returns preview |
| `src/app/api/mocks/import/route.ts` | import commit API — validates + writes mocks/questions/options in transactions |
| `prisma/schema.prisma` | Full DB schema |
| `prisma/seed.ts` | PCM subjects + chapters seed |

## Import Feature
Teacher uploads a `.xlsx` file (MHT CET exam format) via the Import button on `/teacher/mocks`. Two-step flow:

1. **Parse** (`/api/mocks/import/parse`) — reads the file server-side, resolves chapter IDs from DB, converts LaTeX delimiters (`\(...\)` → `$...$`, `\[...\]` → `$$...$$`), groups questions by subject, emits warnings for cross-subject chapter matches. Returns a preview JSON with editable titles and warnings.
2. **Review UI** — teacher sees one card per subject with editable title, question count, and warnings (cross-resolved chapters shown with a Keep/Skip choice).
3. **Commit** (`/api/mocks/import`) — creates one Mock per subject in separate transactions. Options are batch-inserted via `createMany` (avoids P2028 timeout on 200 individual inserts). Transaction timeout is 30s.

### xlsx Column Contract
Required headers (exact): `Q`, `Subject`, `Course`, `Chapter`, `Subtopic`, `Question Context`, `Question`, `OptionA`, `OptionB`, `OptionC`, `OptionD`, `Answer`, `Solution`, `Difficulty Level`

### Known Edge Cases
- Empty option cells (e.g. Q117 Maths/Limits OptionC blank) → replaced with `—` placeholder at parse time
- Chapter appears under wrong subject in xlsx (e.g. "Magnetic Materials" listed under Chemistry) → cross-resolved to correct subject, warning emitted, teacher can Skip
- Answer letter must be A/B/C/D (case-insensitive); invalid answer → question skipped with warning

## Tests
Vitest with `@/` alias pointing to `src/`. Tests mock `@/lib/db` — the real Prisma client requires a live DB URL which isn't available in test environment.

| File | Coverage |
|---|---|
| `src/lib/__tests__/import-utils.test.ts` | `convertLatex`, `answerLetterToIndex`, `deriveTitleFromFilename` (22 tests) |
| `src/app/api/mocks/import/__tests__/parse.test.ts` | parse route end-to-end with real xlsx (17 tests) |
| `src/app/api/mocks/import/__tests__/import.test.ts` | import route validation + DB write shape (16 tests) |

## Vercel Deployment

**Live at:** https://mhtcetmock.vercel.app  
**GitHub:** https://github.com/lwspune/mht-cet-mock

### DB Connection — Prisma Accelerate
Direct Postgres (port 5432) is unreachable from Vercel. Supabase pooler (both session and transaction modes) gives "Tenant or user not found". Solution: **Prisma Accelerate**.

- `@prisma/extension-accelerate` is installed
- `src/lib/db.ts` uses `withAccelerate()` cast to `PrismaClient` to preserve TypeScript types
- `DATABASE_URL` in Vercel = `prisma://accelerate.prisma-data.net/?api_key=...`
- `DIRECT_URL` in Vercel = direct Supabase URL (for local `prisma db push` / `db seed` only)
- Prisma console: console.prisma.io → MHT_CET project → MHT_CET environment (NOT "Development" — that is an empty Prisma-hosted DB)
- **postinstall must be `prisma generate --no-engine`** for Accelerate on Vercel serverless

### Known Issue (as of last session)
Infinite redirect loop at `/` and `/login` — not yet resolved. Likely cause: Prisma Accelerate query failing in `getUser()` causing null return, then middleware loop between `/` and `/login`. Next steps:
1. Update `postinstall` to `prisma generate --no-engine`
2. Check Supabase auth redirect URLs include `https://mhtcetmock.vercel.app`
3. Check Vercel runtime logs for actual error in the redirect path

### MCP (local dev only)
- `.mcp.json` in project root — **gitignored**, contains Supabase PAT. Never commit this file.
- Supabase MCP connects to project ref `pcsxkciizsmzsfyqqjhv`
- Vercel MCP in `~/.claude/mcp.json` globally. Both use `"type": "http"` (not `"transport"`)

### Env vars in Vercel
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (prisma:// URL), `DIRECT_URL` (postgres:// direct URL).
