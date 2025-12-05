import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'

export default function Channel({ token, channel, user }){
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [online, setOnline] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => scrollToBottom(), [messages])

  useEffect(()=>{
    setMessages([])
    fetchMessages()
    // join via API (creates membership) and connect socket
    axios.post(`${base}/channels/${channel.id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>{})
    const s = io(base, { auth: { token } })
    socketRef.current = s
    s.emit('join', { channelId: channel.id })
    s.on('message:new', (m)=>{
      if (m.channelId === channel.id) setMessages(prev=>[...prev, m])
    })
    s.on('presence:update', (list)=> setOnline(list))
    s.on('typing', ({ user: tu, isTyping }) => {
      setTypingUsers(prev => {
        const others = prev.filter(p => p.id !== tu.id)
        if (isTyping) return [...others, tu]
        return others
      })
    })
    s.on('message:deleted', ({ id: mid }) => {
      setMessages(prev => prev.filter(m => m.id !== mid))
    })
    return ()=>{ axios.post(`${base}/channels/${channel.id}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>{}); s.emit('leave', { channelId: channel.id }); s.disconnect(); }
  }, [channel.id])

  async function fetchMessages(){
    try {
      setLoading(true)
      const res = await axios.get(`${base}/channels/${channel.id}/messages`)
      setMessages(res.data)
    } catch (e) {
      console.error('Failed to load messages:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadOlder(){
    if (messages.length === 0) return;
    try {
      const first = messages[0];
      const res = await axios.get(`${base}/channels/${channel.id}/messages?limit=25&cursor=${first.id}`)
      // prepend older messages
      setMessages(prev => [...res.data, ...prev])
    } catch (e) {
      console.error('Failed to load older messages:', e)
    }
  }

  function send(){
    if (!text.trim()) return
    socketRef.current.emit('message:create', { channelId: channel.id, text })
    setText('')
  }

  // typing debounce
  useEffect(()=>{
    if (!socketRef.current) return
    const s = socketRef.current
    let timeout = null
    function startTyping(){
      s.emit('typing', { channelId: channel.id, isTyping: true })
      clearTimeout(timeout)
      timeout = setTimeout(()=> s.emit('typing', { channelId: channel.id, isTyping: false }), 1200)
    }
    if (text !== '') startTyping()
    return ()=>{ clearTimeout(timeout); s.emit('typing', { channelId: channel.id, isTyping: false }) }
  }, [text])

  return (
    <div style={{display:'flex',height:'100%',flexDirection:'column'}}>
      <div style={{padding:16,borderBottom:'1px solid #eee', background: '#f9f9f9'}}>
        <h2 style={{margin: 0, fontSize: 18}}>#{channel.name}</h2>
      </div>
      <div style={{flex:1,overflow:'auto',padding:16, display: 'flex', flexDirection: 'column'}}>
        {messages.length === 0 && !loading && (
          <div style={{textAlign: 'center', color: '#999', margin: 'auto'}}>No messages yet. Start the conversation!</div>
        )}
        {messages.length > 0 && (
          <div style={{marginBottom:12}}>
            <button onClick={loadOlder} style={{padding: '6px 12px', background: '#ecf0f1', border: '1px solid #bdc3c7', borderRadius: 4, cursor: 'pointer', fontSize: 12}}>Load older messages</button>
          </div>
        )}
        {messages.map(m=> (
          <div key={m.id} style={{marginBottom:12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:'#666', marginBottom: 6}}><strong>{m.sender?.name || m.sender?.email || 'Unknown'}</strong> • {new Date(m.createdAt).toLocaleString()}</div>
              <div style={{background: '#f0f0f0', padding: 8, borderRadius: 4, wordWrap: 'break-word'}}>{m.text}</div>
            </div>
            <div style={{width: 60, textAlign: 'right'}}>
              {m.sender?.id === user?.id && (
                <button onClick={async ()=>{
                  try {
                    await axios.delete(`${base}/messages/${m.id}`, { headers: { Authorization: `Bearer ${token}` } })
                  } catch (e) { console.error('delete failed', e) }
                }} style={{background: '#e74c3c', padding: '6px 8px', borderRadius: 4, fontSize: 12}}>Delete</button>
              )}
            </div>
          </div>
        ))}
        <div style={{minHeight: 22}}>
          {typingUsers.length > 0 && (
            <div style={{fontSize:12,color:'#888',padding:'6px 0'}}>
              {typingUsers.map(t=> t.name || t.email).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>
      <div style={{padding:12,borderTop:'1px solid #eee', background: '#fafafa', display: 'flex', gap: 8}}>
        <input style={{flex:1, padding: 10, border: '1px solid #ddd', borderRadius: 4}} value={text} onChange={e=>setText(e.target.value)} onKeyPress={(e)=> e.key === 'Enter' && send()} placeholder="Type a message..." />
        <button onClick={send} style={{padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Send</button>
      </div>
      <div style={{width:280,borderLeft:'1px solid #eee',padding:16, background: '#fafafa', maxHeight: 'calc(100% - 60px)', overflow: 'auto', display: 'flex', flexDirection: 'column'}}>
        <div style={{fontWeight: 'bold', marginBottom: 12}}>🟢 Online ({online.length})</div>
        <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
          {online.map(u=> <li key={u.id} style={{padding: '6px 0', fontSize: 13}}>{u.name || u.email}</li>)}
        </ul>
      </div>
    </div>
  )
}
