# Taskboard frontend

This Next.js app uses FastAPI for registration, sign-in, task management, and AI task breakdown. Start the API first using the [repository setup guide](../README.md), then run `npm ci` and `npm run dev` here. Open [Taskboard](http://localhost:3000).

Next.js forwards `/api/auth`, `/api/tasks`, and `/api/ai` requests to FastAPI. To change the API address, copy `.env.example` to `.env.local`, set `TASK_BOARD_API_URL`, and restart the dev server or rebuild for production. Keep the Gemini API key in the backend's environment.

The frontend renews an expired access token through the same-origin proxy when a request needs it. It keeps the non-secret session ID and short-lived access token in tab-scoped storage; the browser manages the HttpOnly refresh cookie. Run the backend migrations before using the new login flow. Sessions from before this change require one fresh sign-in.

The board groups tickets by status. Click a status total to filter the loaded tickets. In the unfiltered board view, drag a card onto another column to change its status. The status menu also works with a keyboard or on touch devices. Open a ticket to see its details and draft follow-up work with AI.

Press **Ctrl+K** or **⌘K** to search loaded tickets by title or **TB-** number, create a task, or open AI breakdown. AI suggestions can be edited and selected before saving. Selected suggestions are added as individual tickets in **To do**.

## Code layout

| Folder | What belongs there |
| --- | --- |
| `app/` | Next.js route entry points, root layout, and app icon |
| `components/ui/` | Shared buttons, notices, dialogs, icons, and control styles |
| `components/brand/` | Brand mark and orbit artwork |
| `features/auth/` | Sign-in form, account menu, session lifecycle, and authentication requests |
| `features/tasks/` | Board components, board state, task types, and task requests |
| `features/ai/` | Task breakdown requests, dialog, and suggestion editor |
| `features/workspace/` | Switches between sign-in and the authenticated board |
| `lib/` | Shared transport and text helpers |
| `styles/` | Theme tokens, baseline styles, and the stylesheet entry point |

Keep feature-specific components and styles in their feature. Put a component in `components/` when it can be reused without knowing about sessions, tasks, or AI. Keep HTTP paths in the feature API files and import the assembled styles from the root layout.
