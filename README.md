## WhatsApp Web Clone — Full Stack (MongoDB Atlas, Express/Node, React/Vite)

A production-ready, mobile-responsive WhatsApp Web–like chat interface that reads WhatsApp Business API–style webhook payloads, stores them in MongoDB Atlas, and serves them via a clean, well-structured API. The UI mimics WhatsApp Web, supports viewing conversations/messages and sending demo messages (stored only).

### Live Demo

- Backend (Render): `https://whatsapp-backend-tsoe.onrender.com`
- Frontend (Vercel): `https://whatsapp-web-clone-gamma.vercel.app/`

Update these to your deployed URLs and set the environment variables accordingly.

---

### Features

- WhatsApp-like UI with conversations sidebar and chat window
- Conversations grouped by `waId` with last message, timestamp, unread count
- Chat view shows message bubbles, status (sent/delivered/read), timestamps
- “Send Message” demo that persists messages to MongoDB (no external sending)
- Webhook payload ingestion: read JSON payloads and persist into DB
- Robust API with pagination-ready structures and consistent response shapes
- Mobile-friendly, responsive layout (Tailwind CSS)
- Production-grade CORS, rate-limiting, security headers, and logging

---

### Tech Stack

- Backend: Node.js, Express.js, Mongoose (MongoDB Atlas)
- Frontend: React 18, Vite, Tailwind CSS, Heroicons
- Deployment: Render (backend), Vercel (frontend)

---

### Project Structure

```
whatsapp-web-clone/
  backend/
    server.js
    package.json
    src/
      config/database.js
      controllers/messageController.js
      middleware/errorHandler.js
      models/
        Contact.js
        Message.js
      routes/messageRoutes.js
      utils/
        helpers.js
        webhookProcessor.js
    scripts/
      runWebhookProcessor.js   # Reads sample-payloads and seeds MongoDB
      processWebhooks.js       # Demo data generator/populator
      fixContactNames.js       # Contact maintenance utilities
    sample-payloads/
      conversation_*.json      # Sample webhook payloads (messages/status)
  frontend/
    src/
      config/api.js
      components/
        ChatSidebar.jsx
        ChatWindow.jsx
        MessageBubble.jsx
        AddContactModal.jsx
      App.jsx
    vite.config.js
  README.md
```

---

### Prerequisites

- Node.js >= 16
- MongoDB Atlas cluster and a connection string (MONGODB_URI)

---

### Backend Setup (Local)

1) Configure environment variables

PowerShell (Windows):

```powershell
$env:MONGODB_URI='mongodb+srv://<user>:<pass>@<cluster-host>/whatsapp?retryWrites=true&w=majority'
$env:DB_NAME='whatsapp'
$env:FRONTEND_URL='http://localhost:3000'
$env:NODE_ENV='development'
```

2) Install and seed data

```powershell
cd backend
npm install
# Seed from sample-payloads (webhook-like JSON). Writes into both `messages` and `processed_messages`.
npm run process:webhooks
```

3) Start the backend API

```powershell
npm run dev
# Server listens on PORT (default 10000), e.g. http://localhost:10000
```

4) Verify health

```bash
curl http://localhost:10000/health
curl http://localhost:10000/api/conversations
```

---

### Frontend Setup (Local)

1) Configure API base URL for the frontend

- In development, the app auto-falls back to `http://localhost:10000` if `VITE_API_BASE_URL` is not set.
- To be explicit, add `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:10000
```

2) Install and run the dev server

```powershell
cd ../frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

### Environment Variables

- Backend
  - `MONGODB_URI` (required): MongoDB Atlas connection string
  - `DB_NAME` (optional): defaults to `whatsapp`
  - `FRONTEND_URL` (recommended): your deployed frontend URL (for CORS)
  - `NODE_ENV` (`development` | `production`)
  - `WHATSAPP_PHONE_NUMBER` (optional): used for demo/sample generation
- Frontend
  - `VITE_API_BASE_URL` (recommended in prod): points to your backend URL

---

### Data Model Notes

- Primary collection: `messages`
- Assignment compatibility collection: `processed_messages`
  - The backend writes to both to make it easy to validate requirements
  - Controllers fall back to `processed_messages` if needed

---

### API Reference (Core)

- Health
  - `GET /health` → `{ status: 'OK' | 'Active', ... }`
- Conversations
  - `GET /api/conversations` → `{ success, conversations: [ { waId, name, lastMessage, unreadCount, ... } ] }`
- Messages
  - `GET /api/messages/:waId` → `{ success, messages: [ ... ], contact, pagination, ... }`
  - `PUT /api/messages/:waId/read` → Marks incoming messages as read
- Send (Demo)
  - `POST /api/messages/send` → Body `{ waId: string, text: string }`
- Contacts
  - `POST /api/contacts` → Create/ensure a contact exists
  - `GET /api/contacts` → List active contacts
- Search & Stats
  - `GET /api/search/messages?q=...&waId=...`
  - `GET /api/search/contacts?q=...`
  - `GET /api/stats`

All responses include `success` and a timestamp (where relevant). Errors return standard JSON with messages and HTTP status codes.

---

### Webhook Payload Processing

- Sample payloads live in `backend/sample-payloads/`.
- To ingest all JSON payloads into MongoDB:

```powershell
cd backend
npm run process:webhooks
```

This processes messages first, then statuses, and writes into both `messages` and `processed_messages`.

---

### Deployment

Backend (Render)

- Set environment variables in Render:
  - `MONGODB_URI`, `DB_NAME`, `FRONTEND_URL`, `NODE_ENV=production`
- Start command: `node server.js`
- Expose the generated service URL for the frontend

Frontend (Vercel)

- Set `VITE_API_BASE_URL` to your Render backend URL
- Build command: `npm run build` (Vite’s default) if you add one; otherwise Vercel detects React
- After deploy, the app uses the configured API base URL for all requests

---

### Troubleshooting

- CORS blocked origin
  - Ensure `FRONTEND_URL` is set on the backend
  - Backend allows common localhost and `*.vercel.app`, `*.onrender.com` domains
- Empty conversations
  - Run `npm run process:webhooks` in `backend/` to seed MongoDB Atlas
  - Verify `MONGODB_URI` points to the expected cluster/database
- Messages not loading
  - Confirm the frontend uses a reachable `VITE_API_BASE_URL`
  - Check `GET /api/messages/:waId` returns `{ success: true }`
- Send message fails
  - Ensure request body is `{ waId, text }` (not `{ to, body }`)

---

### Development Scripts

Backend

```bash
npm run dev               # Start backend with nodemon
npm run process:webhooks  # Ingest all JSON payloads under sample-payloads/
```

Frontend

```bash
npm run dev               # Start Vite dev server
```

---

### Roadmap / Bonus (Optional)

- WebSocket (Socket.IO) for real-time UI updates (incoming messages, status changes)
- Message search refinement and pagination controls
- Media upload previews and downloads

---

### License

MIT — feel free to use this as a starting point for your own iterations.


