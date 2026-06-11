import { useState, useEffect } from 'react'
import { sb } from './supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Payments from './pages/Payments'

const COLORS = { accent:'#0F7B6C', accentL:'#13A88F', gold:'#F4A020' }

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState('dashboard')

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

  if (!session) return <Auth />

  const user = session.user
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const userInit = userName.slice(0,2).toUpperCase()

  const navItems = [
    { key:'dashboard', icon:'📊', label:'Dashboard' },
    { key:'clients',   icon:'👥', label:'Clients' },
    { key:'payments',  icon:'💳', label:'Payments' },
    { key:'invoices',  icon:'🧾', label:'Invoices', soon: true },
    { key:'insights',  icon:'🤖', label:'AI Insights', soon: true },
    { key:'reports',   icon:'📈', label:'Reports', soon: true },
  ]

  const pages = { dashboard: Dashboard, clients: Clients, payments: Payments }
  const ActivePage = pages[page] || Dashboard

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      {/* SIDEBAR */}
      <aside style={{ width:'220px', background:'#1A1A2E', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0, position:'fixed', top:0, left:0, bottom:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0 20px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width:'32px', height:'32px', background:`linear-gradient(135deg,${COLORS.accent},${COLORS.accentL})`, borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>🧾</div>
          <div>
            <div style={{ color:'#fff', fontSize:'15px', fontWeight:'700' }}>FaidhaTrack</div>
            <div style={{ color:COLORS.accentL, fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase' }}>Invoice Manager</div>
          </div>
        </div>

        <nav style={{ padding:'16px 12px', display:'flex', flexDirection:'column', gap:'3px', flex:1 }}>
          <div style={{ color:'#475569', fontSize:'10px', fontWeight:'600', letterSpacing:'1.5px', textTransform:'uppercase', padding:'12px 10px 5px' }}>Main</div>
          {navItems.map(item => (
            <button key={item.key}
              onClick={() => !item.soon && setPage(item.key)}
              style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'9px 10px', borderRadius:'8px', fontSize:'13px', fontWeight:'500',
                cursor: item.soon ? 'default' : 'pointer', border:'none', width:'100%', textAlign:'left',
                background: page === item.key ? 'rgba(15,123,108,0.25)' : 'none',
                color: page === item.key ? '#fff' : item.soon ? '#475569' : '#94A3B8',
              }}>
              <span style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span>{item.icon}</span> {item.label}
              </span>
              {item.soon && <span style={{ fontSize:'9px', background:'rgba(255,255,255,0.08)', color:'#64748B', padding:'2px 6px', borderRadius:'4px', fontWeight:'600', letterSpacing:'0.5px' }}>SOON</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding:'14px 12px 0', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px' }}>
            <div style={{ width:'30px', height:'30px', background:`linear-gradient(135deg,${COLORS.accent},${COLORS.gold})`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'11px', fontWeight:'700', flexShrink:0 }}>{userInit}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'#fff', fontSize:'12px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userName}</div>
              <div style={{ color:'#64748B', fontSize:'10px' }}>Free plan</div>
            </div>
            <button onClick={() => sb.auth.signOut()} title="Sign out"
              style={{ background:'none', border:'none', cursor:'pointer', color:'#475569', fontSize:'14px', padding:'2px', flexShrink:0 }}>🚪</button>
          </div>
        </div>
      </aside>

      {/* MAIN — offset by sidebar width */}
      <div style={{ marginLeft:'220px', flex:1, display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        <ActivePage session={session} onNav={setPage} />
      </div>
    </div>
  )
}
