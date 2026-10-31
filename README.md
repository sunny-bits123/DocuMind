# DocuMind

**Chat with your documents, with answers you can verify.**

DocuMind is a full-stack RAG (retrieval-augmented generation) app. You upload your own files, ask questions in plain language, and get answers grounded only in those files. Every answer shows where it came from, with the page number, and the original PDF opens next to the chat on that page. If the document doesn't cover your question, DocuMind says so instead of guessing.

## Features

- **Cited answers.** Each answer lists its sources with the file name and page numbers.
- **Side-by-side viewer.** The PDF opens beside the chat at the cited page, with a row of cited pages to jump between.
- **"Not found" refusal.** Passages that don't match the question closely enough are never sent to the model. If nothing matches, the app says it couldn't find an answer.
- **Streaming answers.** Answers appear word by word as they are generated.
- **Multi-document chat.** Select several documents and ask one question across all of them, with a fair share of passages from each.
- **Document overview.** After upload, DocuMind shows a short summary, the main topics and suggested questions.
- **Accounts.** Register and sign in with JWT authentication. Passwords are stored as bcrypt hashes.
- **Private files.** PDFs are served only through an authenticated endpoint that checks who owns the document.
- **Dashboard.** Upload PDF, TXT and Markdown files (up to 20 MB), see their processing status, pin, rename and delete them.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, react-markdown, react-pdf |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| AI | Google Gemini (`gemini-embedding-001` for embeddings, `gemini-3.1-flash-lite` for answers), called through plain `fetch` |
| Auth | JWT, bcryptjs |
| Files | multer, pdf-parse |

No LangChain and no vector database. The retrieval is written from scratch.

## How it works

1. **Upload.** The server extracts the text of each PDF page by page.
2. **Chunk.** The text is split into overlapping chunks of about 220 words (40-word overlap). Each chunk remembers the page or pages it came from.
3. **Embed.** Every chunk is turned into a vector with Gemini's embedding model and saved in MongoDB.
4. **Retrieve.** For a question, DocuMind embeds the question, compares it with every chunk using cosine similarity, and keeps the best matches. Chunks below a similarity cutoff are dropped.
5. **Answer.** The best chunks are sent to Gemini with an instruction to answer only from them. The answer streams back, followed by the sources.
6. **Verify.** The viewer opens the original PDF at the cited pages.

## Run it locally

**Prerequisites:** Node.js 18 or newer, MongoDB running locally (or a MongoDB connection string), and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/sunny-bits123/DocuMind.git
cd DocuMind

# install dependencies (check: these may be one command in your setup)
npm install
npm install --prefix client
npm install --prefix server
```

Create `server/.env` from the example (**check** the names against `server/.env.example`):

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/documind
JWT_SECRET=a-long-random-string
GEMINI_API_KEY=your-gemini-key
CLIENT_URL=http://localhost:3000

# optional
MIN_SIMILARITY=0.5
```

Start the backend and the frontend together (**check** the script name in the root `package.json`):

```bash
npm run dev
```

The client runs at http://localhost:3000 and the API at http://localhost:5000.

## Project structure

```
DocuMind/
├── client/                 React app (Vite)
│   └── src/
│       ├── pages/          Login, Register, Dashboard, ChatPage
│       ├── components/     ChatMessage, DocumentCard, DocumentViewer, ...
│       └── services/       API helpers
└── server/                 Express API
    └── src/
        ├── routes/         auth, documents, chat
        ├── controllers/
        ├── services/       geminiService, ragService
        ├── models/         User, Document, Message
        └── utils/          extractText, chunkText, cosineSimilarity
```

## API overview

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create an account, sign in |
| GET | `/api/auth/me` | Current user |
| POST | `/api/documents/upload` | Upload and process a file |
| GET | `/api/documents`, `/api/documents/:id` | List and read documents |
| GET | `/api/documents/:id/file` | The original file (owner only) |
| POST | `/api/chat/message`, `/api/chat/message/stream` | Ask a question |
| GET | `/api/chat/history/:docId` | Saved conversation |

## Known limits

- **Scanned or handwritten PDFs are not supported.** There is no OCR, so files without selectable text fail with a clear message.
- **Similarity is computed in the app,** which is fine for a personal library but would need a vector database for large collections.
- **The "not found" cutoff is a tuned threshold,** not a guarantee. A vague question that shares words with the document can still pass.
- **No password reset yet.**
- Documents uploaded before page tracking was added open the viewer at page 1.

## Roadmap

- Highlight the cited passage inside the PDF
- OCR for scanned documents
- Password reset by email
- Vector search (for example MongoDB Atlas Vector Search)
- Import from YouTube transcripts

