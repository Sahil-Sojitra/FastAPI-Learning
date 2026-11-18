# Taskboard

Taskboard is a personal task board with a Next.js frontend and a FastAPI API. Sign in to create tasks, move them from **To do** to **In progress** or **Done**, and turn a description into editable task suggestions with AI.

| Folder | Purpose |
| --- | --- |
| [backend](backend/) | FastAPI, authentication, task storage, Alembic migrations, and the Gemini integration |
| [frontend](frontend/) | Next.js dashboard and same-origin forwarding to FastAPI |

This is one Git repository. Start in `frontend/app/` for the dashboard UI or `backend/app/` for the API, authentication, tasks, and AI. Run Git commands from this directory and start each app from its own folder.

## Run locally on Windows

In the first PowerShell terminal, from the repository root:

```powershell
cd backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Before starting a fresh setup, set `JWT_SECRET` in `backend/.env` to a random value of at least 32 bytes. You can generate one with `python -c "import secrets; print(secrets.token_hex(32))"`. For AI breakdown, set `GEMINI_API_KEY` and a supported `GEMINI_MODEL` in the same file. Leave the key empty if you want to run the board without AI.

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

In the second terminal, from the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open [the dashboard](http://localhost:3000) and create an account or sign in. [FastAPI docs](http://127.0.0.1:8000/docs) are also available. Next.js forwards the browser's `/api` calls to FastAPI, so the frontend doesn't need a CORS setting. If FastAPI runs at another address, set `TASK_BOARD_API_URL` in `frontend/.env.local` before starting the dev server or building.

Run `python -m pytest` with the backend environment's Python from `backend/`. Run `npm run lint` and `npm run build` from `frontend/`.

See the [backend guide](backend/README.md) for the API contract, database options, and architecture.
