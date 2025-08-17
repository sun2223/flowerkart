# AI Meeting Notes (Full‑Stack)

Minimal full‑stack web app for AI‑powered meeting notes summarization.
- Frontend: React (Vite)
- Backend: Node.js + Express
- AI: OpenAI API
- Email: nodemailer (SMTP or auto test inbox)

## Prerequisites
- Node.js 18+
- An OpenAI API key

## Project Structure
```
/workspace
  ├── server
  │   ├── index.js
  │   ├── package.json
  │   └── .env.example
  └── client
      ├── index.html
      ├── vite.config.js
      ├── package.json
      └── src
          ├── App.jsx
          └── main.jsx
```

## Backend Setup
1. Copy server env file and set values:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env:
   # - Set OPENAI_API_KEY
   # - Optionally set SMTP_* if you want to send real emails
   ```
2. Install and run the API server:
   ```bash
   cd server
   npm install
   npm run dev
   # Server runs on http://localhost:5000
   ```

## Frontend Setup
1. Install and run the web app:
   ```bash
   cd client
   npm install
   npm run dev
   # App runs on http://localhost:5173
   ```

## Run both (root)
From the repository root (`/workspace`):
```bash
npm run install-all
npm run dev
```
This starts the API on http://localhost:5000 and the web app on http://localhost:5173.

By default the frontend calls the API at http://localhost:5000. To change it, create `client/.env` and set:
```bash
VITE_API_BASE_URL=http://localhost:5000
```

## Endpoints
- POST `/generate-summary`
  - Body: `{ transcript: string, prompt?: string }`
  - Returns: `{ summary: string }`
- POST `/send-summary`
  - Body: `{ summary: string, toEmail: string }`
  - Returns: `{ ok: true, messageId: string, previewUrl?: string }`

If SMTP is not configured, the server uses a nodemailer test account and responds with an `previewUrl` to view the email in a browser.

## Notes
- CORS is open by default. Set `CLIENT_ORIGIN` in `server/.env` to restrict.
- You can change the OpenAI model by setting `OPENAI_MODEL` in `server/.env`.
- Increase payload limits in `server/index.js` if you handle very large transcripts.