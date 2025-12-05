import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Channels({ token, onEnter, user }){
  const [channels, setChannels] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

  useEffect(()=>{ fetchList() }, [])

  async function fetchList(){
    try {
      const res = await axios.get(`${base}/channels`)
      setChannels(res.data)
    } catch (e) {
      console.error('Failed to load channels:', e)
    }
  }

  async function create(){
    if(!name.trim()) return
    setLoading(true)
    try {
      await axios.post(`${base}/channels`, { name }, { headers: { Authorization: `Bearer ${token}` } })
      setName('')
      fetchList()
    } catch (e) {
      console.error('Failed to create channel:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{padding:16, display: 'flex', flexDirection: 'column', height: '100%'}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize: 12, color: '#666', marginBottom: 4}}>Logged in as</div>
        <div style={{fontWeight: 'bold', fontSize: 14}}>{user?.name || user?.email}</div>
      </div>
      <div style={{marginBottom:16}}>
        <input placeholder="New channel name" value={name} onChange={e=>setName(e.target.value)} style={{width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', marginBottom: 8}} />
        <button onClick={create} disabled={loading} style={{width: '100%', padding: 8, background: '#27ae60', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Create</button>
      </div>
      <div style={{color: '#666', fontSize: 12, marginBottom: 8}}>Channels ({channels.length})</div>
      <ul style={{listStyle:'none',padding:0,margin:0,overflow:'auto',flex:1}}>
        {channels.map(c=> (
          <li key={c.id} style={{padding:'10px 8px',cursor:'pointer',marginBottom: 4,background: '#e8f0f7',borderRadius: 4, border: '1px solid #d0dce6'}} onClick={()=>onEnter(c)}>
            <div style={{fontWeight: 500}}>#{c.name}</div>
            <div style={{fontSize: 11, color: '#666', marginTop: 2}}>{c.memberCount || 0} members</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
