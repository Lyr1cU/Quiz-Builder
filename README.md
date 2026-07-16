# Quiz Builder

Full-stack quiz builder: create quizzes with Boolean, Input, and Checkbox questions; list them on a dashboard; view read-only details; delete quizzes.

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

## Create a sample quiz

**Via UI**

1. Open **Create quiz**
2. Enter a title
3. Add at least one question (try all three types)
4. For Checkbox: add options and mark one or more as correct
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
| `POST` | `/quizzes` | Create quiz + nested questions (`201`) |
| `GET` | `/quizzes` | List quizzes (`id`, `title`, `questionsCount`) |
| `GET` | `/quizzes/:id` | Full quiz with questions (`404` if missing) |
| `DELETE` | `/quizzes/:id` | Delete quiz + cascade questions (`204`) |

Error responses use `{ "error": "message" }`.

## Assumptions

- Database is **PostgreSQL** (not SQLite).
- Checkbox options are stored as JSON on `Question.options`: `[{ label, isCorrect }]`.
- Detail page is read-only (no playable quiz mode).
- No authentication.

## Project structure

```text
├── backend/     # Express + Prisma API
├── frontend/    # Next.js UI
└── README.md
```
