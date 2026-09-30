## How to work with me on this project

- HIGH-ROI topics (auth design, RAG/embeddings, agentic tool-calling, 
  architecture decisions, debugging root causes): Never write the 
  implementation first. Explain the concept, ask me guiding questions, 
  let me attempt the code myself, then review what I wrote line-by-line.
- LOW-ROI topics (boilerplate, config, Docker, env setup, CSS, repeated 
  CRUD, docs): Just implement it directly, no need to walk me through it.
- If you're unsure which bucket something falls into, ask before proceeding.
- Quiz me briefly on any new concept before explaining it.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Think_Board is a MERN notes/tasks app with cookie-based JWT auth and brute-force semantic search over task/comment embeddings. It runs as **three independently-started processes** that must all be running for the app to work end-to-end:

1. `Backend/` — Express + Mongoose API, ESM (`"type": "module"`), default port **5002**.
2. `Frontend/` — React 19 + Vite + Tailwind/DaisyUI, dev server on Vite's default port (5173), routed with `react-router`.
3. `EmbeddingService/` — Python Flask microservice wrapping `sentence-transformers` (`all-MiniLM-L6-v2`), port **5001**.

## Commands

```bash
# Backend (from Backend/)
npm install
npm run dev      # nodemon src/server.js, auto-reload
npm start        # node src/server.js

# Frontend (from Frontend/)
npm install
npm run dev       # vite dev server
npm run build     # vite build -> dist/
npm run lint      # eslint .
npm run preview   # preview the built dist/

# EmbeddingService (from EmbeddingService/)
pip install -r requirements.txt
python app.py     # serves on :5001
```

There is no test suite in this project — verify changes by running the relevant dev server and exercising the feature.

`Backend/.env` holds `MONGO_URI`, `ACCESS_TOKEN_SECRET`, Upstash Redis credentials, and optionally `EMBEDDING_SERVICE_URL` (defaults to `http://localhost:5001`) and `PORT` (defaults to 5002). Never print or commit it.

## Architecture

### Routing naming mismatch (important, easy to trip over)

The domain model was renamed from "Notes" to "Tasks" mid-project, but the mount path and Frontend naming were not updated:

- `Backend/src/server.js` mounts `tasksRoutes` at **`/api/notes`** (not `/api/tasks`).
- `Backend/src/models/Note.js` still exists but is **dead code** — `Backend/src/models/Task.js` is the model actually used by `tasksControllers.js`.
- Frontend pages/components still say "Notes" (`NoteCard.jsx`, `NoteDetailPage.jsx`, `NotesNotFound.jsx`) even though they talk to the Task-backed API.

Don't assume `/api/tasks` exists, and don't assume `Note.js` is the live model — check `tasksRoutes.js` / `Task.js` first.

### Auth: JWT access token + rotating refresh token, all via httpOnly cookies

- `Backend/src/models/User.js` — email + bcrypt password hash.
- `Backend/src/models/RefreshToken.js` — refresh tokens are **opaque random strings**, not JWTs; state (`active` / `used` / `revoked`) and `expiresAt` live on the Mongo document, keyed by `deviceId` so multiple devices/sessions can hold independent refresh tokens per user.
- `Backend/src/utils/tokenUtils.js` — issues access JWTs (30 min TTL) and generates refresh token strings (7 day expiry).
- `Backend/src/Controllers/authControllers.js` — `register` / `login` / `refresh` / `logout`. `login` and `refresh` both call `issueTokenPair`, which sets three httpOnly cookies: `accessToken`, `refreshToken`, `deviceId`.
- **Refresh token rotation with reuse detection**: on `/api/auth/refresh`, a token in `used` status being presented again is treated as theft — all of that user's refresh tokens are revoked and cookies cleared. A token that's merely `expired` or `revoked` is treated as a normal "please log in again," not an incident.
- `Backend/src/middleware/requireAuth.js` reads the `accessToken` cookie, verifies it, and sets `req.userId`; it's mounted on every route under `/api/notes` (see `tasksRoutes.js`). A 401 here means the client should call `/api/auth/refresh` and retry, not that the user is unauthenticated forever.
- Cookies are `sameSite: "strict"` and `secure` only in production — this matters if you ever move Frontend/Backend to different origins/ports in dev, since `sameSite: "strict"` blocks cross-site cookie sends. Frontend's `axios` instance (`Frontend/src/lib/axios.js`) currently does **not** set `withCredentials: true`; that will need to be added for cookie-based auth to actually work against the deployed API.

### Semantic search pipeline

- `Backend/src/services/embeddingService.js` calls out to the Flask `/embed` endpoint to get a 384-dim vector for a piece of text. It intentionally does not catch/swallow errors — callers are responsible.
- `Backend/src/Controllers/tasksControllers.js` triggers embedding generation **fire-and-forget** (not awaited) on task create/update and on comment add, so the API response isn't blocked on the embedding round-trip. Each embeddable field has a companion `*_embedding_status` (`pending` / `completed` / `failed`) used to track completion and to exclude not-yet-embedded documents from search.
- A task's embedding is only regenerated when `title` or `content` actually changes — a status-only edit does not re-embed.
- `Backend/src/services/searchService.js` implements `semanticSearch`: a **structured Mongo filter** (embedding-status + optional `status`) is applied first, then brute-force cosine similarity is computed in JS across all matching tasks and their comments (`O(q * d * n)`, fine at this project's scale). Structured and semantic filtering are deliberately kept as separate stages rather than merged into one query — preserve that separation when extending search.
- Route ordering matters: `GET /search` is registered before `GET /:id` in `tasksRoutes.js` so Express doesn't swallow `/search` as an `:id` param — keep new task routes below `/search` or above `/:id` accordingly.

### Rate limiting

`Backend/src/middleware/rateLimiter.js` + `Backend/src/config/upstash.js` apply a global sliding-window limit (100 req / 20s) backed by Upstash Redis, applied to every request before the auth routes.

### Production serving

When `NODE_ENV=production`, `server.js` serves `Frontend/dist` as static files and falls back to `index.html` for any unmatched route (SPA routing). In non-production, CORS is opened for `http://localhost:5173` (the `origin` key is set twice in the `cors()` config in `server.js` — the second assignment silently wins, so the EC2-IP origin line above it currently has no effect).
