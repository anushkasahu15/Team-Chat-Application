import React, { useState } from 'react'
import axios from 'axios'

export default function Login({ onAuth }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')

  const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

  async function submit(e){
    e.preventDefault()
    setError('')
    try{
      const url = mode === 'login' ? `${base}/auth/login` : `${base}/auth/signup`
      const res = await axios.post(url, { email, password, name })
      onAuth(res.data.token, res.data.user)
    }catch(e){
      setError(e.response?.data?.error || e.message)
    }
  }

  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f5'}}>
      <div style={{maxWidth:400, width:'100%', padding:0, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 8, overflow: 'hidden'}}>
        {/* Tabs */}
        <div style={{display: 'flex', borderBottom: '2px solid #eee'}}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: 16,
              background: mode === 'login' ? '#3498db' : '#f9f9f9',
              color: mode === 'login' ? 'white' : '#333',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 16,
              transition: 'all 0.3s'
            }}
          >
            Log In
          </button>
          <button
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: 16,
              background: mode === 'signup' ? '#3498db' : '#f9f9f9',
              color: mode === 'signup' ? 'white' : '#333',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 16,
              transition: 'all 0.3s'
            }}
          >
            Sign Up
          </button>
        </div>
        
        {/* Form */}
        <div style={{padding: 30}}>
          <h2 style={{textAlign: 'center', marginBottom: 20, fontSize: 20}}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          {error && <div style={{background: '#fee', color: '#c33', padding: 10, marginBottom: 15, borderRadius: 4, fontSize: 14}}>{error}</div>}
          <form onSubmit={submit}>
            {mode==='signup' && (
              <div style={{marginBottom: 12}}>
                <input placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} style={{width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', fontSize: 14}} />
              </div>
            )}
            <div style={{marginBottom: 12}}>
              <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', fontSize: 14}} />
            </div>
            <div style={{marginBottom: 15}}>
              <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', fontSize: 14}} />
            </div>
            <div style={{marginBottom: 12}}>
              <button type="submit" style={{width: '100%', padding: 12, background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 16}}>{mode==='login' ? 'Log In' : 'Sign Up'}</button>
            </div>
          </form>
          
          {/* Helper text */}
          <div style={{textAlign: 'center', fontSize: 12, color: '#666', marginTop: 16}}>
            {mode === 'login' ? (
              <>
                Don't have an account? <button onClick={() => setMode('signup')} style={{background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontWeight: 'bold'}}>Sign Up</button>
                <br />
                <br />
                Demo account: <strong>alice@example.com</strong> / <strong>password</strong>
              </>
            ) : (
              <>
                Already have an account? <button onClick={() => setMode('login')} style={{background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontWeight: 'bold'}}>Log In</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
