# Quiz Builder

Full-stack quiz builder: create quizzes with Boolean, Input, Single-choice, and Multiple-choice questions; list them on a dashboard; view read-only details; delete quizzes.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma, Zod, PostgreSQL
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, React Hook Form + Zod

## Prerequisites

- **Node.js** 20+ (tested with Node 24)
- **PostgreSQL** 14+ running locally (or any reachable Postgres instance)
- npm 10+

If you do not have PostgreSQL installed, the backend includes an optional embedded Postgres helper:

```bash
cd backend
npm install
cp .env.example .env   # default credentials already match the embedded Postgres
npm run db:embedded
# keep this terminal open, then in another:
npx prisma db push
```

## Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your Postgres connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/quiz_builder?schema=public"
PORT=3001
FRONTEND_ORIGIN="http://localhost:3000"
JWT_SECRET="change-me-to-a-long-random-secret"
JWT_EXPIRES_IN="7d"
GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
AI_GRADING_ENABLED="true"
```

Create the database (once), then install and push the schema:

```bash
# In psql or your Postgres client:
# CREATE DATABASE quiz_builder;

npm install
npx prisma db push
npm run seed   # optional — creates "JavaScript Basics" sample quiz
npm run dev    # http://localhost:3001
```

Health check: `GET http://localhost:3001/health`

## Frontend setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev    # http://localhost:3000
```

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Run both

1. Start PostgreSQL
2. Terminal A: `cd backend && npm run dev`
3. Terminal B: `cd frontend && npm run dev`
4. Open http://localhost:3000

## Deploy (Vercel)

Hosting target: **two Vercel projects** from this monorepo (DB stays on **Neon** — no data migrate). Render free sleep is the reason we’re leaving Render.

### 1. API (`backend/`)

1. In [Vercel](https://vercel.com/new): Import the GitHub repo → **Root Directory** = `backend`
2. Framework: Express (auto-detected via `src/app.ts`)
3. Environment variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon **pooler** connection string (`sslmode=require`) |
| `FRONTEND_ORIGIN` | Frontend URL, e.g. `https://quiz-builder-web.vercel.app` (comma-separated OK) |
| `JWT_SECRET` | Long random secret |
| `JWT_EXPIRES_IN` | `7d` (optional) |
| `GROQ_API_KEY` | optional |
| `GROQ_MODEL` | `llama-3.1-8b-instant` (optional) |
| `AI_GRADING_ENABLED` | `true` / `false` |

4. Deploy → note the API URL (e.g. `https://quiz-builder-api.vercel.app`)
5. Smoke-check: `GET /health`

### 2. Frontend (`frontend/`)

1. New Vercel project from the same repo → **Root Directory** = `frontend`
2. Env:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | API URL from step 1 (no trailing slash) |

3. Deploy, then set `FRONTEND_ORIGIN` on the API project to the frontend URL and redeploy API if needed.

### Local vs production

- Local: `backend` `npm run dev` still uses `app.listen` (skipped when `VERCEL` is set).
- `render.yaml` is **legacy** — keep only if you still run Render.

## Create a sample quiz

**Via UI**

1. Open **Create quiz**
2. Enter a title
3. Add at least one question (try all three types)
4. For Single: one correct option (radio). For Multiple: one or more (checkboxes)
5. Submit — you land on the detail page; the quiz also appears under **Quizzes**

**Via seed**

```bash
cd backend
npm run seed
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register (`email`, `password`, optional `name`) → `{ user, token }` |
| `POST` | `/auth/login` | Login → `{ user, token }` |
| `POST` | `/auth/logout` | Client should discard JWT (`204`) |
| `GET` | `/auth/me` | Current user (Bearer JWT) |
| `POST` | `/quizzes` | Create quiz (`visibility` PUBLIC\|PRIVATE, **auth**) |
| `POST` | `/quizzes/validate-import` | Validate import/generate draft JSON (`formatVersion: 1`, **auth**) |
| `POST` | `/quizzes/generate` | Generate quiz draft from study text via Groq (**auth**, rate limited) |
| `PUT` | `/quizzes/:id` | Update own quiz (full replace of questions, **auth**) |
| `GET` | `/quizzes` | Public quizzes + own private (if logged in). Optional `?q=` search (title/description) |
| `GET` | `/quizzes/invite/:token` | Quiz via invite (**no answers**) |
| `POST` | `/quizzes/:id/invite/regenerate` | New invite token (owner, private) |
| `DELETE` | `/quizzes/:id/invite` | Revoke invite (owner) |
| `GET` | `/quizzes/:id/play` | Play payload without answers (`?invite=` for private) |
| `GET` | `/quizzes/invite/:token/play` | Play payload via invite |
| `POST` | `/quizzes/:id/questions/:questionId/check` | Grade one answer (returns `isCorrect` only — no answer key) |
| `POST` | `/quizzes/:id/attempts` | Save finished practice attempt (**auth required**; guests do not save) |
| `GET` | `/attempts` | Current user’s attempts across quizzes (**auth**) |
| `GET` | `/quizzes/:id/attempts` | Current user’s attempts for this quiz (**auth**) |
| `GET` | `/quizzes/:id/attempts/:attemptId` | Own attempt detail (**auth**) |
| `GET` | `/quizzes/:id/export/pdf?variant=worksheet\|answers` | Download PDF (public: anyone; private: owner) |
| `GET` | `/quizzes/:id` | Quiz by id (private: owner only; answers only for owner) |
| `DELETE` | `/quizzes/:id` | Delete own quiz (`204`, **auth**) |

Send `Authorization: Bearer <token>` for protected routes.

Error responses use `{ "error": "message" }`.

## Assumptions

- Database is **PostgreSQL** (not SQLite).
- Choice options (SINGLE / MULTIPLE) are stored as JSON on `Question.options`: `[{ label, isCorrect }]`.
- Detail page is read-only for review; **practice mode** is at `/quizzes/:id/play` (and invite play).
- Practice checks answers on the server after each question (training feedback).
- INPUT answers: exact match first, then **Groq** semantic check if `GROQ_API_KEY` is set (fallback to exact on API errors).
- PDF export: worksheet (Name/Date/Grade blanks, no answers) and answer key — public quizzes anyone; private only owner.
- Auth: email + password + **JWT** (Bearer). OAuth not planned.
- Demo seed user: `alice@example.com` / `password123` (after `npm run seed`).
- Guests can browse **public** quizzes; create/delete require login.
- **Private** quizzes: owner only by id; guests open via `/quizzes/invite/:token` (answers hidden).
- Practice attempt history is per signed-in user only (guests do not save).

## Project structure

```text
├── backend/     # Express + Prisma API
├── frontend/    # Next.js UI
└── README.md
```
