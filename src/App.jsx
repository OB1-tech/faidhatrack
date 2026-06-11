import { useState, useEffect } from 'react'
import { sb } from './supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F8FA' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🧾</div>
        <div style={{ fontSize:'14px', color:'#6B7280' }}>Loading FaidhaTrack...</div>
      </div>
    </div>
  )

  return session ? <Dashboard session={session} /> : <Auth />
}
