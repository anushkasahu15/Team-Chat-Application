# Mini Team Chat — Final Project Documentation

Purpose: Complete, interview-ready documentation for the Mini Team Chat application. Contains full tech stack, setup, backend & frontend architecture and flows, every command you need, debugging tips, deployment notes, and sample interview questions & answers.

---

**Table of Contents**
- Project Summary
- Tech Stack & Versions
- Repository Structure
- Prerequisites
- Environment Variables (samples)
- Install, Migrate, Seed, Run (every command)
- Backend Architecture
  - Server entry, REST endpoints, Socket.IO flows
  - Authentication flow (JWT)
  - Database schema (Prisma) and relationships
  - Presence + typing + message deletion logic
- Frontend Architecture
  - Component breakdown and UI flows
  - Socket interactions and state management
  - Pagination and optimistic updates
- End-to-End Flows (step-by-step sequences)
- Deployment & Production Notes
- Security Considerations
- Troubleshooting & Common Errors
- Interview Questions & Answer Guidance
- Appendix: Test accounts, useful snippets

---

## Project Summary
Mini Team Chat is a minimal full-stack real-time chat application with:
- Email/password authentication (JWT)
- Channels (rooms) with memberships
- Real-time messaging using Socket.IO
- Presence tracking and typing indicators
- Message deletion (sender-only)
- Message pagination (cursor-based)
- Backend: Node.js + Express + Prisma (SQLite for dev)
- Frontend: React + Vite

This document explains exact commands, internal flows, architectural choices, and answers to common interview questions about the project.

---

## Tech Stack & Versions (exact where applicable)
- Node.js (LTS >= 18 tested)
- npm (>= 8)
- Backend packages: express, socket.io (v4.x), prisma (v5+), @prisma/client, bcryptjs, jsonwebtoken, cors, dotenv
- Frontend packages: react (18.x), react-dom, vite (5.x), axios, socket.io-client, react-router-dom
- Database (dev): SQLite (file `backend/dev.db` via Prisma)
- Recommended production DB: PostgreSQL (Prisma supports switching via `DATABASE_URL`)

---

## Repository Structure (important files)
- `backend/`
  - `src/index.js` — server entry (Express + Socket.IO)
  - `src/middleware/auth.js` — JWT middleware for protected routes
  - `prisma/schema.prisma` — data models
  - `prisma/seed.js` — seed script (creates demo users & channels)
  - `package.json` — backend scripts: `dev`, `seed`, etc.
  - `.env` — environment variables used by backend
- `frontend/`
  - `src/App.jsx` — top-level app + routing
  - `src/pages/Login.jsx` — login/signup UI
  - `src/pages/Channels.jsx` — channel list UI
  - `src/pages/Channel.jsx` — message UI, socket integration
  - `src/styles.css` — styling
  - `package.json` — frontend scripts: `dev`, `build`, `preview`
- Root files
  - `README.md` — simplified quick-start (kept)
  - `PROJECT_DOCUMENTATION.md` — this file

---

## Prerequisites
- Git installed and configured
- Node.js installed (LTS recommended)
- npm (comes with Node)
- (Optional for prod) PostgreSQL instance or other DB

---

## Environment Variables (sample)
Place these in `backend/.env` (development):

```
DATABASE_URL="file:./dev.db"
JWT_SECRET=change_this_to_a_secure_random_value
PORT=4000
```

Frontend environment (optional) in `frontend/.env` or using Vite `VITE_` prefix:

```
VITE_API_URL=http://localhost:4000
```

---

## Install, Migrate, Seed, Run — Every Command (Windows `cmd.exe` style)

1) Backend: install dependencies

```cmd
cd "c:\Users\Anushka\mini teamchat application\backend"
npm install
```

2) Initialize Prisma DB (development) — run migrations and generate client

```cmd
cd "c:\Users\Anushka\mini teamchat application\backend"
# generate prisma client and run dev migrations (prompts may appear)
npx prisma migrate dev --name init
# or, if using prisma db push during dev
npx prisma db push
```

3) Seed the database (sample accounts & channels)

```cmd
cd "c:\Users\Anushka\mini teamchat application\backend"
npm run seed
```

4) Start backend in development mode (auto-reload if using nodemon)

```cmd
cd "c:\Users\Anushka\mini teamchat application\backend"
npm run dev
# (dev script typically runs: nodemon src/index.js or node src/index.js)
```

5) Frontend: install & run dev server

```cmd
cd "c:\Users\Anushka\mini teamchat application\frontend"
npm install
npm run dev
# open http://localhost:5173 in browser
```

6) Build frontend for production

```cmd
cd "c:\Users\Anushka\mini teamchat application\frontend"
npm run build
npm run preview  # optional to preview build locally
```

7) Full workflow recap (all steps in sequence)

```cmd
# from project root
cd "c:\Users\Anushka\mini teamchat application\backend"
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run seed
npm run dev

# in new terminal
cd "c:\Users\Anushka\mini teamchat application\frontend"
npm install
npm run dev
```

Notes:
- If you change `schema.prisma` you must re-run `npx prisma migrate dev` or `npx prisma db push` and `npx prisma generate`.
- If you rename `.env.local` to `.env`, Prisma will pick it up. Always ensure correct path.

---

## Backend Architecture — Details

### Entry point: `backend/src/index.js` (high-level)
- Creates an Express app and HTTP server
- Attaches a Socket.IO server to same HTTP server
- Configures middleware: `cors`, `express.json()`, JWT middleware on protected routes
- REST endpoints implemented for login/signup, fetching channels, creating channels, messages (pagination), delete message
- Socket.IO event handlers: `connection`, `join`, `leave` (if implemented), `message`, `typing`, `deleteMessage`, `disconnect`
- In-memory presence tracking: Map<userId, Set<socketId>> or Object mapping userId to set of socket ids

### REST API (example endpoints and purpose)
- POST /auth/signup — body `{ name, email, password }` — creates user, returns JWT
- POST /auth/login — body `{ email, password }` — returns `{ token, user }`
- GET /channels — returns list of channels (with member counts)
- POST /channels — create a new channel (protected)
- GET /channels/:channelId/messages?limit=25&cursor=<messageId> — pagination endpoint
- DELETE /messages/:messageId — protected, verifies ownership then deletes

(Exact route names are in `backend/src/index.js` — check file for definitions.)

### Socket.IO events (conceptual)
- Client connects with JWT token (e.g., via `socket = io(API_URL, { auth: { token } })`)
- Server validates JWT when socket connects; attaches userId to socket
- `join` (channelId) — socket joins `room` named with `channelId`; server may emit current presence for that channel
- `message` — payload `{ channelId, text }` — server writes message to DB, then `io.to(channelId).emit('message', message)` to all members
- `typing` — payload `{ channelId }` — server broadcasts `typing` events to room (debounced on client) using `io.to(channelId).emit('typing', { userId })`
- `deleteMessage` — server verifies ownership then deletes message and emits `messageDeleted` to room
- `disconnect` — server updates presence map; if no sockets remain for a user, mark user offline and emit presence update

### Authentication Flow (JWT)
- On login/signup server returns a signed JWT (HMAC using `JWT_SECRET`)
- Token stored client-side (localStorage) and attached to outgoing REST calls via `Authorization: Bearer <token>` header
- For sockets, token is sent in `auth` property when initiating socket connection. Server verifies token and uses `userId` to associate socket
- Middleware `auth.js` validates tokens for protected REST routes and sets `req.user = { id, name }` for handlers

### Database: Prisma Schema (key models)
Example (simplified):

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  memberships Membership[]
  messages  Message[]
}

model Channel {
  id        String   @id @default(cuid())
  name      String   @unique
  messages  Message[]
  memberships Membership[]
}

model Membership {
  id        String @id @default(cuid())
  user      User   @relation(fields: [userId], references: [id])
  userId    String
  channel   Channel @relation(fields: [channelId], references: [id])
  channelId String
}

model Message {
  id        String   @id @default(cuid())
  text      String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  channel   Channel  @relation(fields: [channelId], references: [id])
  channelId String
  createdAt DateTime @default(now())
}
```

### Presence & Typing (implementation notes)
- Presence: a server-side map tracks user -> set of socketIds so a single user with multiple tabs/browsers remains "online" until all sockets disconnect.
- When a socket joins a channel, server computes users currently online in that channel and emits a `presence` update to the channel.
- Typing: clients emit `typing` events; server forwards to the channel. Client-side debouncing ensures typing messages are not sent too frequently (e.g., 1200ms debounce). Server should not persist typing states beyond transient usage.

---

## Frontend Architecture — Details

### Main files & responsibilities
- `src/App.jsx` — top-level, read token from localStorage, sets axios defaults (Authorization header), sets routes to `Login`, `Channels`, `Channel` pages, handles global logout
- `src/pages/Login.jsx` — signup/login UI, posts to `/auth/login` or `/auth/signup`, stores JWT on success and redirects to channels
- `src/pages/Channels.jsx` — lists channels, allows creating new channels (POST /channels), shows online counts (via socket presence or REST augment)
- `src/pages/Channel.jsx` — core chat UI: connects to Socket.IO (with token), joins channel room, handles incoming `message`, `typing`, `presence`, and `messageDeleted` events. Responsible for message input, send, delete, message list with load-more for pagination

### Socket integration pattern
- Create socket after login: `const socket = io(API_URL, { auth: { token } })`.
- On socket `connect`, emit `join` event with current `channelId`.
- Listen for: `message`, `typing`, `presence`, `messageDeleted`.
- On `message` send: optimistically show pending message if desired, then upon server `message` event update list
- On window/tab close: socket disconnect triggers presence update server-side

### Message pagination & cursor
- When opening channel, client requests messages via REST: `GET /channels/:channelId/messages?limit=25` returns last 25 messages
- To load older messages, include `cursor=<messageId>` representing the oldest message currently loaded; server returns previous messages before that id
- This cursor approach avoids offset-based pagination and is stable for concurrent writes

### Token handling
- Token stored in `localStorage` under a key (e.g., `token`) and set into axios default header for REST calls:

```js
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

- On logout, remove token and disconnect socket

---

## End-To-End Flows (step-by-step)

1) New user sign-up and first message
- User fills signup form -> `POST /auth/signup` -> server creates user with bcrypt-hashed password, returns JWT -> client stores JWT -> client initiates socket connecting with token -> server validates token and adds socket to presence map -> user creates/joins channel -> emits `join` -> server responds with `presence` and may send recent messages.
- User enters message and clicks send -> client emits `message` -> server saves to DB -> `io.to(channelId).emit('message', savedMessage)` -> all connected clients update UI

2) Deleting a message
- User clicks delete on own message -> frontend calls `DELETE /messages/:id` or emits socket `deleteMessage` -> server verifies `authorId === req.user.id` -> deletes message -> emits `messageDeleted` to room -> clients remove message from UI

3) Typing indicator
- Client listens for input events, debounces them (1200ms) and emits `typing` events while user types -> server forwards to other clients in room -> receiving clients display "User is typing..." until typing events stop or timeout

4) Presence across tabs
- If user logs in in two browsers, both sockets are stored under same `userId`; presence stays online until all sockets disconnect

---

## Deployment & Production Notes

1) Database
- For production, switch `DATABASE_URL` to a managed Postgres or MySQL instance. Update `schema.prisma` if using DB-specific types.

2) Socket scaling
- Socket.IO with multiple Node instances requires a message adapter like Redis. Use `@socket.io/redis-adapter` or `socket.io-redis` and configure your host/port. Also ensure your load balancer supports sticky sessions OR use Redis adapter + graceful reconnection to avoid lost events.

3) HTTPS & CORS
- Serve backend under HTTPS. Configure `cors` with explicit allowed origins (your frontend domain) and avoid wildcard in production.

4) JWT secrets
- Use a strong random secret stored in environment variables or secret manager. Rotate periodically if needed.

5) Rate limiting & abuse
- Implement rate limiting on REST endpoints and socket events for `message` to avoid spam.

6) Static frontend hosting
- The built frontend (`npm run build`) can be hosted on Netlify, Vercel, GitHub Pages (if SPA routing configured), or any static host. Backend must be served from a server with sockets (Heroku, Render, DigitalOcean App Platform, etc.).

---

## Security Considerations
- Passwords hashed with bcrypt; never log raw passwords.
- JWT tokens: keep expiry reasonable (e.g., 7 days) and consider refresh token pattern for production.
- Validate socket auth tokens on `connection` to avoid unauthorized socket access.
- Verify user permission for actions (e.g., only message author can delete message)
- Sanitize text if rendering HTML (avoid XSS) — by default render as plain text.

---

## Troubleshooting & Common Errors
- "Prisma cannot find .env": make sure `backend/.env` exists and contains `DATABASE_URL`.
- DB migration errors: run `npx prisma migrate reset` in dev (caution: wipes DB) or `npx prisma db push`.
- Socket events not received across instances: ensure Redis adapter configured if horizontally scaled.
- CORS errors: double-check `cors()` config on backend and `VITE_API_URL` on frontend.
- Token issues: ensure axios default header set with `Bearer <token>` and socket `auth` includes token when connecting.

---

## Interview Questions & Suggested Answers (detailed)

Q: Why Socket.IO instead of WebSocket directly?
A: Socket.IO provides a higher-level abstraction: automatic reconnection, rooms, event names, binary support, heartbeat, and fallbacks when real WebSocket is unavailable. For quick dev and presence/rooms, Socket.IO simplifies implementation. For very high-performance scenarios, raw WebSocket or lower-level solutions might be used.

Q: How do you handle user presence reliably?
A: I keep an in-memory mapping from userId to a set of socketIds. On `connection` add socketId to set; on `disconnect` remove it. If set is empty, user is offline. For clustered deployments, this should be backed by a shared store like Redis.

Q: Explain message pagination technique you used.
A: Cursor-based pagination using message `id` (or createdAt timestamp) as a cursor. Client requests messages before the cursor. This avoids offset performance issues and is safe with concurrent writes.

Q: How do you secure the WebSocket connection?
A: Attach JWT in `auth` during socket client initialization. Server validates JWT on `connection` and attaches the decoded user to socket state. Also implement server-side checks for any action that changes data.

Q: How would you scale the app to thousands of users?
A: Use Redis adapter for Socket.IO so messages are broadcast across all instances, use horizontal scaling for Node servers behind load balancer, ensure sticky sessions OR rely on Redis adapter for routing, move DB to managed Postgres, implement background jobs for heavy tasks, add caching where appropriate.

Q: How to handle message ordering?
A: Persist messages with `createdAt` timestamps and/or numeric IDs. Return sorted by `createdAt` ascending for display. Use DB transaction to ensure consistent writes. Client should rely on server-provided timestamps for final ordering.

Q: How would you implement message edits (instead of deletion)?
A: Add `editedAt` and `edited` fields in `Message` model. Provide REST endpoint `PATCH /messages/:id` that verifies author and updates text + sets `editedAt`. Emit `messageUpdated` via socket to the room.

Q: How to make the app accessible (a11y)?
A: Ensure labels on inputs, keyboard navigation, ARIA attributes for live regions for incoming messages/typing/presence, and color contrast compliance.

Q: How to test this app?
A: Unit tests for utility functions and API using Jest; integration tests for REST endpoints using Supertest; end-to-end UI tests using Playwright or Cypress to simulate two browsers and verify real-time behavior.

---

## Appendix

### Sample env values
```
# backend/.env
DATABASE_URL="file:./dev.db"
JWT_SECRET=very_long_random_string_here
PORT=4000

# frontend/.env
VITE_API_URL=http://localhost:4000
```

### Test accounts (from seed)
- `alice@example.com` / `password`
- `bob@example.com` / `password`

### Useful snippets
- Start backend & frontend (PowerShell/cmd)

```cmd
# backend
cd "c:\Users\Anushka\mini teamchat application\backend"
npm run dev

# frontend
cd "c:\Users\Anushka\mini teamchat application\frontend"
npm run dev
```

- Socket client connection example

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000', { auth: { token: localStorage.getItem('token') } });
```

---

If you want, I can:
- Add code snippets copied directly from your actual files for accurate line references (e.g., show exact `index.js`, `Login.jsx`, or `schema.prisma` content).
- Produce a shorter `INTERVIEW_PREP.md` extracted from this doc with the most-likely interview questions and one-minute answers.

Next: I'll mark the documentation creation step completed. If you want me to also create a short interview-prep file or include exact file excerpts, tell me and I'll include them.
