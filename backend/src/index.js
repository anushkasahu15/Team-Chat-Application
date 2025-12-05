require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
const auth = require('./middleware/auth');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secretdev';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hashed, name } });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// Channels
app.get('/channels', async (req, res) => {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { memberships: true } } }
  });
  // map to include memberCount
  res.json(channels.map(c => ({ ...c, memberCount: c._count?.memberships || 0 })));
});

// create channel (requires auth)
app.post('/channels', auth, async (req, res) => {
  const { name, isPrivate } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const channel = await prisma.channel.create({ data: { name, isPrivate: !!isPrivate } });
  res.json(channel);
});

// Messages pagination: ?limit=25&cursor=<isoDate>
// messages pagination: ?limit=25&cursor=<messageId> returns older messages before cursor
app.get('/channels/:channelId/messages', async (req, res) => {
  const { channelId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const cursor = req.query.cursor; // message id cursor
  const where = { channelId };
  const findArgs = {
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { sender: { select: { id: true, name: true, email: true } } }
  };
  if (cursor) {
    findArgs.cursor = { id: cursor };
    findArgs.skip = 1; // exclude the cursor message itself
  }
  const messages = await prisma.message.findMany(findArgs);
  // return in chronological order
  res.json(messages.reverse());
});

// delete message (only sender can delete)
app.delete('/messages/:id', auth, async (req, res) => {
  const { id } = req.params;
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.senderId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });
  await prisma.message.delete({ where: { id } });
  // notify channel members
  io.to(msg.channelId).emit('message:deleted', { id, channelId: msg.channelId });
  res.json({ ok: true });
});

// join channel
app.post('/channels/:channelId/join', auth, async (req, res) => {
  const { channelId } = req.params;
  try {
    const membership = await prisma.membership.create({ data: { channelId, userId: req.user.id } });
    res.json({ ok: true, membership });
  } catch (err) {
    res.status(400).json({ error: 'Could not join channel', details: err.message });
  }
});

// leave channel
app.post('/channels/:channelId/leave', auth, async (req, res) => {
  const { channelId } = req.params;
  try {
    await prisma.membership.deleteMany({ where: { channelId, userId: req.user.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not leave channel', details: err.message });
  }
});

// get multiple users by ids: /users?ids=id1,id2
app.get('/users', async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  if (ids.length === 0) return res.json([]);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
  res.json(users);
});

// current user
app.get('/auth/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Simple in-memory presence: map userId -> set of socket ids
const presence = new Map();

async function emitPresence() {
  const ids = Array.from(presence.keys());
  if (ids.length === 0) return io.emit('presence:update', []);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
  io.emit('presence:update', users);
}

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
  } catch (err) {
    console.log('socket auth failed', err.message);
  }
  next();
});

io.on('connection', (socket) => {
  const user = socket.user;
  if (user) {
    const cur = presence.get(user.id) || new Set();
    cur.add(socket.id);
    presence.set(user.id, cur);
    emitPresence();
  }

  socket.on('join', async ({ channelId }) => {
    socket.join(channelId);
    // emit presence for this specific channel
    const ids = Array.from(presence.keys());
    if (ids.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
      io.to(channelId).emit('presence:update', users);
    }
  });

  socket.on('leave', ({ channelId }) => {
    socket.leave(channelId);
  });

  socket.on('message:create', async ({ channelId, text }) => {
    if (!user) return;
    const msg = await prisma.message.create({ data: { text, channelId, senderId: user.id } });
    const out = {
      id: msg.id,
      text: msg.text,
      createdAt: msg.createdAt,
      sender: { id: user.id, name: user.name },
      channelId
    };
    io.to(channelId).emit('message:new', out);
  });

  // typing indicator - use io.to() to send to all sockets in the channel
  socket.on('typing', ({ channelId, isTyping }) => {
    if (!user) return;
    io.to(channelId).emit('typing', { user: { id: user.id, name: user.name, email: user.email }, isTyping });
  });

  socket.on('disconnect', () => {
    if (user) {
      const cur = presence.get(user.id) || new Set();
      cur.delete(socket.id);
      if (cur.size === 0) presence.delete(user.id);
      else presence.set(user.id, cur);
      emitPresence();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
