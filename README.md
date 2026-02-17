# Chat with Dr Ash Tewari

A research prototype for patient education and emotional support. **Non-diagnostic, non-therapeutic.**

## Stack

- **Backend**: FastAPI (Python) + **Gemini API** (free-tier capable)
- **Frontend**: React + Vite + TypeScript + Tailwind

## Setup

1. **Gemini API key** (required for LLM):
   ```bash
   # Get key from Google AI Studio and set in .env
   GEMINI_API_KEY=your_key_here
   ```

2. **Backend** (Python 3.10+):
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Frontend**:
   ```bash
   npm install
   ```

4. **Environment** (optional – `.env`):
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-flash-latest
   CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```

   **Frontend environment variables** (create `.env.local` or set in GitHub Actions):
   ```
   VITE_API_BASE_URL=http://localhost:8888          # Main API server (chat, settings, etc.)
   VITE_SPEECH_API_BASE_URL=http://localhost:8889   # Optional: Separate speech server
   ```
   If `VITE_SPEECH_API_BASE_URL` is not set, speech requests will use the main API server.

## Run

**Option A** – Run both (backend + frontend):
```bash
npm run start
```

**Option B** – Run separately:
```bash
# Terminal 1: Backend
npm run backend

# Terminal 2: Frontend
npm run dev
```

- Frontend: http://localhost:5173 (with **Hot Module Replacement** - updates automatically on file changes)
- Backend API: http://localhost:8000

**Hot Reload**: The frontend automatically updates when you save changes to any `.tsx`, `.ts`, `.css`, or other source files. No need to manually refresh the browser!

**Watch Mode**: For production builds that auto-rebuild on changes:
```bash
npm run build:watch
```

## Deploy (GitHub Pages + Render)

### 1) Deploy backend to Render

Create a new **Web Service** from this repo and set:

- **Build command**
  - `pip install -r backend/requirements.txt`
- **Start command**
  - `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

Set Render environment variables:

- `GEMINI_API_KEY=...`
- `GEMINI_MODEL=gemini-1.5-flash-latest`
- `CORS_ALLOW_ORIGINS=https://<your-github-username>.github.io`

After deploy, note your backend URL, e.g.:

- `https://your-backend.onrender.com`

### 2) Deploy frontend to GitHub Pages

For GitHub Pages build, set:

- `VITE_API_BASE_URL=https://your-backend.onrender.com`

Build with correct base path:

- `npm run build -- --base=/digital-avatar/`

Publish `dist/` to GitHub Pages (via Actions or gh-pages branch).

If your repo name is different, replace `/digital-avatar/` with your repo path.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Clinician config |
| GET | `/api/settings` | Get settings & master prompt |
| PUT | `/api/settings` | Update settings (body: `{ system_prompt?, model?, temperature?, max_tokens?, preset? }`) |
| GET | `/api/prompts/presets` | Get prompt presets |
| POST | `/api/chat/sessions` | Create new chat session |
| GET | `/api/chat/history?session_id=` | Get chat history for session |
| POST | `/api/chat` | Send message, get response (body: `{ message, session_id? }`) |
| POST | `/api/speech` | Generate speech audio (body: `{ text, session_id?, speaker_id?, language? }`) - returns audio URL |
| POST | `/api/speech/stream` | **Stream TTS audio in real-time** (body: `{ text, session_id?, speaker_id?, language? }`) - streams MP3 chunks as they're generated |
| POST | `/api/avatar/video` | Optional: SadTalker lip-sync video (body: `{ text }`) – requires `REPLICATE_API_TOKEN` |

## Avatar (LiteAvatar / OpenAvatar style)

- **Photo-based avatar** – Uses `drtewari.png` (or config `avatar_image_url`)
- **Talking animation** – Speaking glow/ring animates when audio is playing
- **Optional full lip-sync** – POST `/api/avatar/video` with text → SadTalker generates lip-synced video (Replicate API, ~70s, paid)

## Features

- **Gemini API** – free-tier capable LLM
- Session-based **chat history** (in-memory, per session)
- **Settings & master prompts** – Train/customize model behavior via UI
  - Editable system prompt (master prompt)
  - Presets: Default, Concise, Empathetic, Educational
  - Model name, temperature, max tokens
  - Persisted to `data/settings.json`
- Text-based patient questions → educational responses
- **Real-time streaming TTS** – `/api/speech/stream` streams audio chunks as they're generated (no waiting for full file)
- Text-to-speech output (browser Web Speech API fallback)
- **Photo-based talking avatar** – Dr Tewari's photo with animated glow when speaking
- Safety guardrails: no diagnosis, no medications, no emergencies
- Scope classification with refusal + escalation language
- Swappable clinician config for other specialties

## Disclaimer

This tool provides educational information and emotional support. It does not provide medical advice.
