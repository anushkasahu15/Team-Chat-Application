import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import Channels from './pages/Channels'
import Channel from './pages/Channel'
import axios from 'axios'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))
  const [activeChannel, setActiveChannel] = useState(null)

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    if (user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
    // set axios default authorization header
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    else delete axios.defaults.headers.common['Authorization']
  }, [token, user])

  if (!token) return <Login onAuth={(t,u) => { setToken(t); setUser(u); }} />

  return (
    <div style={{display: 'flex', height: '100vh', flexDirection: 'column'}}>
      <div style={{background: '#2c3e50', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{margin: 0, fontSize: 20}}>Mini Team Chat</h1>
        <button onClick={() => { setToken(null); setUser(null); }} style={{padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 4}}>Logout</button>
      </div>
      <div style={{display: 'flex', flex: 1, overflow: 'hidden'}}>
        <div style={{width: 320, borderRight: '1px solid #ddd', overflow: 'auto', background: '#f5f5f5'}}>
          <Channels token={token} onEnter={(c)=>setActiveChannel(c)} user={user} />
        </div>
        <div style={{flex:1, display: 'flex', flexDirection: 'column'}}>
          {activeChannel ? <Channel token={token} channel={activeChannel} user={user} /> : <div style={{padding:20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', height: '100%'}}>Select a channel to start chatting</div>}
        </div>
      </div>
    </div>
  )
}
