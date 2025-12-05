# Mini Team Chat Application

A real-time team chat application with user authentication, channels, and instant messaging.

## Quick Start

### Prerequisites
- Node.js installed
- Both `backend/` and `frontend/` folders ready

### Setup & Run

**1. Backend Setup**
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:4000`

**2. Frontend Setup** (open a new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

**3. Open Browser**
- Go to `http://localhost:5173`
- Log in with:
  - Email: `alice@example.com`
  - Password: `password`

## Features

- ✅ User signup / login (JWT auth)
- ✅ Channels (create, join, leave)
- ✅ Real-time messaging (Socket.IO)
- ✅ Online users presence
- ✅ Typing indicators
- ✅ Message deletion (sender only)
- ✅ Message pagination (load older messages)
- ✅ Persistent message storage (SQLite)

## Demo with Two Users

**Use Incognito Mode for side-by-side testing:**

1. **Window 1 (Normal):**
   - Open `http://localhost:5173`
   - Log in as: `alice@example.com` / `password`
   - Join `#general` channel

2. **Window 2 (Incognito - Ctrl+Shift+N):**
   - Open `http://localhost:5173`
   - Log in as: `bob@example.com` / `password`
   - Join `#general` channel

**Now test:**
- Send messages (appear instantly in both windows)
- See "Online Users" update in real-time
- Type and see typing indicator
- Delete messages (only as sender)

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: React, Vite, Axios
- **Database**: Prisma ORM, SQLite (local dev)
- **Authentication**: JWT (stateless tokens)
- **Real-time**: WebSockets (Socket.IO)

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── index.js          # Main server (Express + Socket.IO)
│   │   └── middleware/
│   │       └── auth.js       # JWT verification
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.js           # Sample data
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx     # Auth page
│   │   │   ├── Channels.jsx  # Channel list
│   │   │   └── Channel.jsx   # Chat interface
│   │   ├── App.jsx           # Main app
│   │   └── styles.css
│   └── package.json
└── README.md
```

## Seeded Test Accounts

- Email: `alice@example.com` / Password: `password`
- Email: `bob@example.com` / Password: `password`

## Troubleshooting

**"Network Error" on login:**
- Ensure backend is running (you should see "Server running on http://localhost:4000")
- Refresh the page

**Messages not appearing:**
- Check both users are in the same channel
- Backend should be running

**Can't see second user online:**
- Use incognito/private window (keeps separate localStorage)
- Both must be in the same channel

---

For detailed project architecture, see `PROJECT_DOCUMENTATION.md`
