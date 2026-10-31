# DocuMind Client

React + Vite frontend for DocMind, matching the original design (teal/gold/cream theme) with a leaner MVP scope: standard email/password auth (no Google OAuth yet), single-document RAG chat (no group chats yet).

## Setup

```bash
npm install
```

`.env` is already included with the correct default (`VITE_API_URL=/api`), which works with the backend's Vite proxy config out of the box — no changes needed for local development.

```bash
npm run dev
```

Runs on `http://localhost:3000` and proxies `/api` and `/uploads` requests to the backend at `http://localhost:5000`. **Make sure the backend server is running first.**

## Structure

- `src/pages/` — Login, Register, Dashboard, ChatPage
- `src/components/` — Sidebar, DocumentCard, ChatMessage, Logo (inline SVG, no image file dependency), Loader, ProtectedRoute
- `src/layouts/DashboardLayout.jsx` — shared sidebar + document list, polls for pending upload status every 3s
- `src/context/AuthContext.jsx` — global auth state, token persisted to `localStorage`
- `src/services/` — thin fetch wrappers matching the backend's exact API contract
- `src/styles/global.css` — single stylesheet, organized by section (auth pages, sidebar, dashboard, chat)

## Notes

- The logo is a hand-built inline SVG component (`components/Logo.jsx`), not an image file — this avoids any risk of a missing/broken logo asset.
- Document status (`pending` → `ready`/`failed`) is polled automatically after upload; no manual refresh needed.
- Not yet built (matches backend MVP scope): Google OAuth, group chats, real-time streaming responses, avatar upload UI (backend route exists, frontend form not wired up yet).
