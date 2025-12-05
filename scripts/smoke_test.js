const axios = require('axios')
const { io } = require('socket.io-client')

const API = process.env.API || 'http://localhost:4000'

async function loginOrSignup(email, name = 'User'){
  try {
    const res = await axios.post(`${API}/auth/login`, { email, password: 'password' })
    return res.data
  } catch (e) {
    // try signup
    const res = await axios.post(`${API}/auth/signup`, { email, password: 'password', name })
    return res.data
  }
}

async function run(){
  console.log('Starting smoke test against', API)
  const alice = await loginOrSignup('alice@example.com', 'Alice')
  const bob = await loginOrSignup('bob@example.com', 'Bob')
  console.log('Logged in users:', alice.user.email, bob.user.email)

  // ensure channel exists
  let channels = (await axios.get(`${API}/channels`)).data
  let general = channels.find(c => c.name === 'general')
  if (!general){
    general = (await axios.post(`${API}/channels`, { name: 'general' }, { headers: { Authorization: `Bearer ${alice.token}` } })).data
    console.log('Created channel general')
  }

  // connect sockets
  const s1 = io(API, { auth: { token: alice.token } })
  const s2 = io(API, { auth: { token: bob.token } })

  s1.on('connect', () => console.log('alice socket connected'))
  s2.on('connect', () => console.log('bob socket connected'))

  s1.on('presence:update', users => console.log('alice sees presence:', users.map(u=>u.email||u.name)))
  s2.on('presence:update', users => console.log('bob sees presence:', users.map(u=>u.email||u.name)))

  s1.on('message:new', m => console.log('alice received message:new', m.text, 'from', m.sender && m.sender.name))
  s2.on('message:new', m => console.log('bob received message:new', m.text, 'from', m.sender && m.sender.name))

  // join channel
  s1.emit('join', { channelId: general.id })
  s2.emit('join', { channelId: general.id })

  // wait a moment then send message from alice
  await new Promise(r => setTimeout(r, 500))
  console.log('alice sending message...')
  s1.emit('message:create', { channelId: general.id, text: 'Hello from Alice (smoke test)' })

  // test typing indicator
  s2.emit('typing', { channelId: general.id, isTyping: true })

  // wait to observe events
  await new Promise(r => setTimeout(r, 1500))

  s1.disconnect()
  s2.disconnect()
  console.log('Smoke test complete')
}

run().catch(e => { console.error('Smoke test failed', e.message); process.exit(1) })
