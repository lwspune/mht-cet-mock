# MHT CET Mock Platform — Project Guide

## What This Is
Full-stack mock test platform for MHT CET (Physics, Chemistry, Maths only — no Biology).
Two roles: **Teacher** (creates mocks, manages students) and **Student** (attempts mocks, views performance).

## Development Preferences

### UI
- All student-facing screens must be mobile-first. Use Tailwind responsive prefixes (`sm:`, `md:`) and test layouts at 375px width. Touch targets must be at least 44px. Avoid horizontal scroll.

### Backend Integrity (project additions)
- API response shape must be `{ data }` on success, `{ error }` on failure — no exceptions. Scoring and grading logic must stay server-side, never in client JS.

### Accessibility (project addition)
- Use Tailwind `focus-visible:` utilities for focus styles on all interactive elements.

### Definition of Done (project override)
- Golden path must be verified in the browser at **375px width** specifically.

### Security (project additions)
- Never use `dangerouslySetInnerHTML` with user-supplied content. Keep RLS enabled on all Supabase tables.

### Dependency Management (project context)
- Stack is Next.js, Tailwind, Supabase, Prisma — exhaust these before adding any package.

### Test Scope (project addition)
- Prefer integration tests over mocks for API routes. Unit-test pure utility functions.

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
/teacher/students/[id]/performance → view a student's performance (+ per-attempt Reset buttons)
/teacher/mocks           → mock list (+ Import button)
/teacher/mocks/new       → create mock
/teacher/mocks/[id]/edit → edit mock + manage questions + Reset All Attempts
/teacher/frequency       → MHT CET chapter frequency table editor (pre-populated from PYQ data, editable)

/student/dashboard       → student home (subject accuracy bars + weak chapters + recent attempts)
/student/mocks           → browse published mocks (Reattempt CTA if allowed)
/student/mocks/[id]      → mock detail + Reattempt button if allowed
/student/mocks/[id]/attempt → exam UI (timer, navigator, auto-save)
/student/performance     → 5-tab performance dashboard

/api/mocks               → GET (list), POST (create)
/api/mocks/[id]          → GET, PATCH (title/duration/marks/isPublished/allowReattempt), DELETE
/api/mocks/[id]/attempts → DELETE: teacher bulk-reset all attempts for a mock
/api/mocks/[id]/questions → GET, POST
/api/mocks/[id]/questions/[questionId] → PATCH, DELETE
/api/attempts            → POST: start or resume attempt
/api/attempts/[id]       → DELETE: teacher (any attempt on own mock) or student (own, if allowReattempt)
/api/attempts/[id]/questions → GET: returns questions for an attempt filtered by ?filter=correct|wrong|unattempted
/api/attempts/[id]/answers → GET, PATCH (auto-save)
/api/attempts/[id]/submit  → POST: score + mark SUBMITTED
/api/mocks/import/parse  → POST: upload .xlsx → returns preview JSON (ParseResponse)
/api/mocks/import        → POST: commits previewed mocks to DB (ImportRequest → ImportResponse)

/api/course/[courseSlug]/frequency      → GET: list chapter frequencies grouped by subject; PUT: reset to PYQ defaults
/api/course/[courseSlug]/frequency/[chapterId] → PATCH: update a single chapter's pct (teacher only)
```

## Auth Pattern — Critical
Three helpers in `src/lib/auth.ts`. **Never mix them up.**

| Context | Helper | On failure |
|---|---|---|
| Page / Layout (Server Component) | `requireRole('TEACHER')` | Next.js `redirect()` |
| API route — single role | `apiRequireRole('TEACHER')` | Returns `NextResponse` 401/403 |
| API route — any auth'd user | `apiAuth()` | Returns `NextResponse` 401 |

API routes must check: `if ('error' in auth) return auth.error`

Use `apiAuth()` when the same endpoint serves both teachers and students (e.g. `DELETE /api/attempts/[id]`); branch on `user.role` inside the handler.

## Database
Schema in `prisma/schema.prisma`. Key invariants:
- `User.id` === Supabase `auth.users.id` (UUID) — must match on creation
- `MockAttempt` is unique per `[mockId, studentId]` — one active attempt per student per mock
- `AttemptAnswer.selectedOptionId = null` means unattempted (not wrong)
- Score: `+marksCorrect` (correct), `-marksWrong` (wrong + selected), `0` (null selectedOptionId)
- Performance data is derived from `attempt_answers` joined with `chapters` — no denormalized counters
- `Course` / `CourseSubjectConfig` / `ChapterFrequency` — course-aware score predictor. MHT CET course seeded with Physics=50m, Chem=50m, Maths=100m. `ChapterFrequency.pct` is teacher-editable; defaults computed from PYQ question distribution. Future courses: add a `Course` row + `CourseSubjectConfig` rows + re-run seed.
- `Mock.allowReattempt Boolean @default(false)` — teacher-controlled gate; when true, students may delete their submitted attempt and start fresh via `DELETE /api/attempts/[id]`
- `Question.solution String?` — optional explanation, supports KaTeX. Populated by xlsx import; editable in QuestionEditor.
- `Question.subtopicName String?` — nullable; populated from xlsx `Subtopic` column at import time. Manually-added questions have null.
- `Question.pyqYear String?` — nullable; e.g. `"May'2021"`. Populated from xlsx `PYQ` column (optional column — absent means null). Editable in QuestionEditor. Existing 748 PYQ questions backfilled via SQL on 2026-05-02.
- Deleting a `Mock` cascades to `Question`, `MockAttempt` → `AttemptAnswer` (full cascade chain). `AttemptAnswer.questionId` is CASCADE (not RESTRICT) — critical for mock deletion to work when attempts exist.

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

**Stale closure fix (critical):** `scheduleSave` uses `pendingSavesRef` (a `Map` ref) instead of reading from the React `answers` state. Values are passed directly into `scheduleSave(qid, selectedOptionId, isFlagged)` at call time. This prevents the debounce timer from sending stale `null` values to the server — the bug that caused answered questions to save as unattempted.

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
npm run db:seed      # seed subjects, chapters, MHT CET course config + chapter frequencies (idempotent)
npx prisma studio    # browse DB in browser
npx vitest           # run all tests (132 tests, 10 suites)
npx vitest run       # run once (no watch mode)
```

## Key Files
| File | Purpose |
|---|---|
| `src/lib/auth.ts` | Auth helpers (see Auth Pattern above) |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/performance.ts` | 7 query functions: 4 for performance tabs + `getDashboardInsights` + `getProjectedScores(studentId, courseSlug, mode, recentN)` + `getSubjectFrequencies` |
| `src/lib/scoring.ts` | `rescoreSubmittedAttempts(mockId, tx)` — recomputes `AttemptAnswer.isCorrect` + `MockAttempt.score/maxScore` for all SUBMITTED attempts; called inside PATCH question transaction |
| `src/lib/supabase/server.ts` | `createClient()` + `createAdminClient()` |
| `src/middleware.ts` | Session refresh on every request |
| `src/app/student/performance/PerformanceTabs.tsx` | Client shell for all 5 performance tabs + subject filter |
| `src/components/math/KatexRenderer.tsx` | KaTeX renderer |
| `src/components/teacher/QuestionEditor.tsx` | Question add/edit with live KaTeX preview + image upload |
| `src/components/teacher/QuestionEditDialog.tsx` | Edit/delete question dialog (pencil icon on question list) |
| `src/components/teacher/MockForm.tsx` | Mock settings form — title, duration, marks, allowReattempt checkbox |
| `src/components/teacher/AddStudentDialog.tsx` | Add student modal |
| `src/components/teacher/ResetAttemptsButton.tsx` | Bulk-reset all student attempts for a mock (with confirmation) |
| `src/components/teacher/ResetAttemptButton.tsx` | Reset one student's attempt from performance page (with confirmation) |
| `src/components/teacher/DeleteMockButton.tsx` | Delete mock with inline confirmation (calls DELETE /api/mocks/[id]) |
| `src/components/student/ReattemptButton.tsx` | Student reattempt with score warning + confirmation |
| `src/components/teacher/ImportMockButton.tsx` | Client wrapper that opens the import dialog |
| `src/components/teacher/ImportMockDialog.tsx` | 4-step import dialog: upload → review → importing → done |
| `src/lib/import-types.ts` | Shared types: `ParsedQuestion`, `ParseResponse`, `ImportRequest`, `ImportResponse` |
| `src/lib/import-utils.ts` | Pure helpers: `convertLatex`, `answerLetterToIndex`, `deriveTitleFromFilename` |
| `src/app/api/mocks/import/parse/route.ts` | xlsx parse API — reads file, resolves chapters, returns preview |
| `src/app/api/mocks/import/route.ts` | import commit API — validates + writes mocks/questions/options in transactions |
| `src/app/api/mocks/[id]/questions/[questionId]/route.ts` | PATCH + DELETE for individual questions |
| `src/app/api/mocks/[id]/attempts/route.ts` | DELETE — teacher bulk-reset all attempts for a mock |
| `src/app/api/attempts/[id]/route.ts` | DELETE — teacher or student (if allowReattempt) deletes one attempt |
| `src/app/api/course/[courseSlug]/frequency/route.ts` | GET all chapter frequencies; PUT reset to PYQ defaults |
| `src/app/api/course/[courseSlug]/frequency/[chapterId]/route.ts` | PATCH single chapter pct |
| `src/app/teacher/frequency/page.tsx` | Teacher frequency table editor page |
| `src/components/teacher/FrequencyTableEditor.tsx` | Editable pct table per chapter, Save All, Reset to PYQ Defaults |
| `src/components/performance/ProjectedScoreCard.tsx` | Per-subject predictor card: score, progress bar, milestones, top-6 chapters |
| `src/components/performance/ScorePredictorTab.tsx` | PCM total + 3 subject cards, subject-filter aware. Toggle between All-time and Recent (Last 3) modes; accepts `data` + optional `recentData` prop |
| `prisma/schema.prisma` | Full DB schema |
| `prisma/seed.ts` | PCM subjects + chapters + MHT CET course config + chapter frequencies from PYQ data |

## Import Feature
Teacher uploads a `.xlsx` file (MHT CET exam format) via the Import button on `/teacher/mocks`. Two-step flow:

1. **Parse** (`/api/mocks/import/parse`) — reads the file server-side, resolves chapter IDs from DB, converts LaTeX delimiters (`\(...\)` → `$...$`, `\[...\]` → `$$...$$`), groups questions by subject, emits warnings for cross-subject chapter matches. Returns a preview JSON with editable titles and warnings.
2. **Review UI** — teacher sees one card per subject with editable title, question count, and warnings (cross-resolved chapters shown with a Keep/Skip choice).
3. **Commit** (`/api/mocks/import`) — creates one Mock per subject in separate transactions. Options are batch-inserted via `createMany` (avoids P2028 timeout on 200 individual inserts). Transaction timeout is 30s.

### xlsx Column Contract
Required headers (exact): `Q`, `Subject`, `Course`, `Chapter`, `Subtopic`, `Question Context`, `Question`, `OptionA`, `OptionB`, `OptionC`, `OptionD`, `Answer`, `Solution`, `Difficulty Level`

Optional header: `PYQ` — year string (e.g. `"2021"`). When present and non-empty, stored as-is in `Question.pyqYear`. Absent or blank → `null`. Legacy xlsx files without this column import without error.

### Known Edge Cases
- Empty option cells (e.g. Q117 Maths/Limits OptionC blank) → replaced with `—` placeholder at parse time
- Chapter appears under wrong subject in xlsx (e.g. "Magnetic Materials" listed under Chemistry) → cross-resolved to correct subject, warning emitted, teacher can Skip
- Answer letter must be A/B/C/D (case-insensitive); invalid answer → question skipped with warning
- Empty `Subtopic` cell → stored as `null` (not empty string); questions group by `chapterName` as fallback in performance UI
- Empty `PYQ` cell → stored as `null` (not empty string)

## Tests
Vitest with `@/` alias pointing to `src/`. Tests mock `@/lib/db` — the real Prisma client requires a live DB URL which isn't available in test environment.

**132 tests, 10 suites** — `npx vitest run`

| File | Coverage |
|---|---|
| `src/lib/__tests__/import-utils.test.ts` | `convertLatex`, `answerLetterToIndex`, `deriveTitleFromFilename` (22 tests) |
| `src/lib/__tests__/performance.test.ts` | `getDashboardInsights` — subject accuracy, weak chapters, sort order (6 tests) |
| `src/lib/__tests__/projected-scores.test.ts` | `getProjectedScores` — accuracy, not-tested, gap sort, milestones + recent mode (13 tests) |
| `src/app/api/mocks/import/__tests__/parse.test.ts` | parse route end-to-end with real xlsx (20 tests, incl. subtopicName + pyqYear) |
| `src/app/api/mocks/import/__tests__/import.test.ts` | import route validation + DB write shape (20 tests, incl. subtopicName + solution + pyqYear) |
| `src/app/api/mocks/[id]/questions/__tests__/question.test.ts` | PATCH + DELETE question — auth, validation, 404/409, solution + pyqYear + rescore (18 tests) |
| `src/app/api/mocks/[id]/attempts/__tests__/attempts.test.ts` | DELETE bulk-reset — auth, ownership, count (4 tests) |
| `src/app/api/attempts/__tests__/attempt.test.ts` | DELETE attempt — teacher + student auth paths, allowReattempt gate (8 tests) |
| `src/app/api/attempts/[id]/questions/__tests__/questions.test.ts` | GET questions with filter — auth, filter values (9 tests) |
| `src/app/api/course/[courseSlug]/frequency/__tests__/frequency.test.ts` | PATCH frequency — auth, validation, 404, upsert (10 tests) |

## Student Performance Dashboard
`/student/performance` — 5-tab server component, data fetched in parallel via `Promise.all`.

| Tab | Component | Data source |
|---|---|---|
| Exam-wise | `ExamWiseTable` | `getExamPerformance()` |
| Chapter-wise | `ChapterWiseChart` (Recharts) | `getChapterPerformance()` |
| Wrong Answers | `WrongAudit` | `getWrongAnswers()` |
| Unattempted | `UnattemptedAudit` | `getUnattemptedQuestions()` |
| Score Predictor | `ScorePredictorTab` → `ProjectedScoreCard` | `getProjectedScores()` |

### Exam-wise Table
Per-attempt rows with score, accuracy, and a Review dropdown (Correct / Wrong / Unattempted). Selecting a filter fetches `/api/attempts/[id]/questions?filter=...` and expands question cards inline. Mobile: card layout (`md:hidden`); desktop: full table (`hidden md:block`).

### Chapter-wise Chart
Single `% correct` bar per chapter, sorted ascending (weakest first). Color-coded: red < 40% (weak), amber 40–70% (moderate), green ≥ 70% (strong). Inline value labels. Subject filter via `PerformanceTabs`. Y-axis `width={130}`, names truncated at 18 chars.

### Wrong Answers + Unattempted (same UX pattern)
Two-view drill-down:
1. **Subtopic list** — groups by `subtopicName` (falls back to `chapterName` if null), sorted worst-first (highest count at top), colored badge.
2. **Question cards** — click subtopic to drill in. Cards match exam review format: Q{n} badge, chapter pill, status badge, all 4 options (green ✓ correct, red ✗ selected-wrong / gray for unattempted), Show/Hide solution toggle.
Back button returns to subtopic list. Subject filter resets to list view.

### Score Predictor Tab
Shows a PCM combined total card + 3 per-subject `ProjectedScoreCard`s. Each card shows:
- Projected score (large number, color-coded by % of max)
- Progress bar with milestone markers: Cutoff (30%), Merit (50%), Rank (70%)
- Top-6 chapters by gap (marksAtStake − projected), sorted largest-gap first
- Chapters never answered shown as `0.0 / X.X  not tested`

**Toggle:** "All-time" vs "Recent (Last 3)". Both datasets are pre-fetched server-side in the same `Promise.all`; the toggle is instant client state. Recent mode uses the last 3 submitted mocks **per subject** so each subject has its own recency window. Toggle only renders when recent data exists.

**Algorithm:** `projected = (correct / total) × marksAtStake` per chapter. `marksAtStake = (pct / 100) × subjectMaxMarks`. `getProjectedScores` accepts `mode: 'all' | 'recent'` and `recentN = 3`; in recent mode it fetches the last N `MockAttempt` IDs per subject before filtering answers.

**Teacher frequency editor** at `/teacher/frequency` — editable pct per chapter per subject, must sum to 100%. "Reset to PYQ Defaults" button recomputes from live PYQ question distribution via `PUT /api/course/mht-cet/frequency`.

### Answer Key Correction + Rescore
When a teacher edits a question via `PATCH /api/mocks/[id]/questions/[questionId]`, all SUBMITTED attempts for that mock are rescored atomically in the same interactive transaction. `rescoreSubmittedAttempts` (in `src/lib/scoring.ts`) recomputes `AttemptAnswer.isCorrect` from the updated `Option.isCorrect` values and recalculates `MockAttempt.score` + `maxScore` from scratch. Response includes `rescoredAttempts: number`.

## DB Seed Data

Production DB contains 15 imported PYQ mocks (Physics, Chemistry, Maths × 2021–2025), totalling 748 questions. All have `pyqYear` set to `May'YYYY`.

| Year | Physics | Chemistry | Maths |
|---|---|---|---|
| 2021 | 50 q | 50 q | 50 q |
| 2022 | 50 q | 50 q | 48 q |
| 2023 | 50 q | 50 q | 50 q |
| 2024 | 50 q | 50 q | 50 q |
| 2025 | 50 q | 50 q | 50 q |

Mock titles follow the pattern `MHT CET YYYY — Subject`. All mocks are currently unpublished (not visible to students until the teacher publishes them).

The `prisma/seed.ts` script seeds subjects + chapters + MHT CET course config + chapter frequencies (computed from PYQ question distribution). It does not seed mocks or questions — those were imported via the xlsx import feature.

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

### MCP (local dev only)
- `.mcp.json` in project root — **gitignored**, contains Supabase PAT. Never commit this file.
- Supabase MCP connects to project ref `pcsxkciizsmzsfyqqjhv`
- Vercel MCP in `~/.claude/mcp.json` globally. Both use `"type": "http"` (not `"transport"`)

### Env vars in Vercel
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (prisma:// URL), `DIRECT_URL` (postgres:// direct URL).
