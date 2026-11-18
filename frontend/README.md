# Taskboard frontend

This Next.js app uses FastAPI for registration, sign-in, task management, and AI task breakdown. Start the API first using the [repository setup guide](../README.md), then run `npm ci` and `npm run dev` here. Open [Taskboard](http://localhost:3000).

Next.js forwards `/api/auth`, `/api/tasks`, and `/api/ai` requests to FastAPI. To change the API address, copy `.env.example` to `.env.local`, set `TASK_BOARD_API_URL`, and restart the dev server or rebuild for production. Keep the Gemini API key in the backend's environment.

The board groups tasks by status and searches titles. AI suggestions are editable before saving and are added as individual tasks in **To do**.
