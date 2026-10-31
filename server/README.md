# DocuMind Server

Express + MongoDB backend for DocuMind, a RAG-powered document chat app.

## Stack

- **Express** — REST API
- **MongoDB Atlas + Mongoose** — data storage (users, documents, chat messages)
- **Google Gemini** — embeddings (`text-embedding-004`) + chat generation (`gemini-1.5-flash`)
- **Multer** — file uploads (documents + avatars)
- **JWT** — authentication

## How RAG works here

1. **Upload**: a PDF/TXT/MD file is saved to disk, text extracted (`pdf-parse` for PDFs).
2. **Chunk**: text is split into ~220-word chunks with 40-word overlap so context isn't lost at boundaries.
3. **Embed**: each chunk is sent to Gemini's embedding model and the resulting vector is stored alongside the chunk text in MongoDB.
4. **Ask**: when a question comes in, it's embedded the same way, then compared against every stored chunk using cosine similarity (computed in-app — no Atlas Vector Search index required, which keeps setup simple for a portfolio project).
5. **Answer**: the top 4 most relevant chunks are inserted into a prompt instructing Gemini to answer only from that context, and the response is returned along with which chunks were used (for citation display in the UI).

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `MONGODB_URI` — from MongoDB Atlas (Connect → Drivers)
- `JWT_SECRET` — any long random string
- `GEMINI_API_KEY` — free at https://aistudio.google.com/apikey

```bash
npm run dev
```

Server runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Log in |
| GET | `/api/auth/me` | Yes | Current user |
| PUT | `/api/auth/profile` | Yes | Update name / avatar (multipart) |
| POST | `/api/documents/upload` | Yes | Upload a document (multipart, field: `file`) |
| GET | `/api/documents` | Yes | List your documents |
| GET | `/api/documents/:id` | Yes | Get one document |
| PUT | `/api/documents/:id` | Yes | Rename / pin a document |
| DELETE | `/api/documents/:id` | Yes | Delete a document |
| POST | `/api/chat/message` | Yes | Ask a question (`{ message, docId }` or `{ message, docIds: [] }`) |
| GET | `/api/chat/history/:docId` | Yes | Get chat history for a document |

All authenticated routes expect `Authorization: Bearer <token>`.

## Notes

- This is the MVP scope: single/multi-document RAG chat with auth. Group chats, Google OAuth, and real-time streaming are not yet implemented — they can be layered on top of this foundation later.
- Document processing (chunking + embedding) happens in the background after upload responds, so the upload call returns immediately with `status: "pending"`. Poll `GET /api/documents/:id` or re-fetch the list to see when `status` becomes `"ready"`.
