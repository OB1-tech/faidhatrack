import { useState } from 'react'
import { sb } from '../supabase'

const C = {
  ink:'#1A1A2E', slate:'#16213E', accent:'#0F7B6C', accentL:'#13A88F',
  gold:'#F4A020', surface:'#F7F8FA', card:'#FFFFFF', muted:'#6B7280',
  border:'#E5E7EB', danger:'#DC2626',
}

function Field({ label, type='text', placeholder, value, onChange }) {
  const [foc, setFoc] = useState(false)
  return (
    <div style={{ marginBottom:'14px' }}>
      <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:C.ink, marginBottom:'5px' }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width:'100%', padding:'10px 13px', fontSize:'14px',
          border:`1.5px solid ${foc ? C.accent : C.border}`,
          borderRadius:'8px', outline:'none', color:C.ink, background:C.card, boxSizing:'border-box' }} />
    </div>
  )
}

export default function Auth() {
  const [tab, setTab]         = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [lf, setLf] = useState({ email:'', password:'' })
  const [sf, setSf] = useState({ name:'', business:'', email:'', password:'' })

  const clear = () => { setError(''); setSuccess('') }

  const handleLogin = async () => {
    clear()
    if (!lf.email || !lf.password) return setError('Please fill in all fields.')
    setLoading(true)
    const { error: err } = await sb.auth.signInWithPassword({ email:lf.email, password:lf.password })
    setLoading(false)
    if (err) return setError(err.message)
  }

  const handleSignup = async () => {
    clear()
    if (!sf.name || !sf.email || !sf.password) return setError('Please fill in all required fields.')
    if (sf.password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    const { error: err } = await sb.auth.signUp({
      email: sf.email, password: sf.password,
      options: { data: { full_name:sf.name, business_name:sf.business } }
    })
    setLoading(false)
    if (err) return setError(err.message)
    setSuccess('Account created! Check your email to confirm, then sign in.')
  }

  const handleGoogle = async () => {
    clear()
    const { error: err } = await sb.auth.signInWithOAuth({
      provider:'google', options:{ redirectTo: window.location.origin }
    })
    if (err) setError(err.message)
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .auth-left  { display: none !important; }
          .auth-right { padding: 32px 20px !important; }
          .auth-card  { max-width: 100% !important; }
        }
      `}</style>

      <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Inter','Segoe UI',sans-serif", background:C.surface }}>

        {/* LEFT PANEL — desktop only */}
        <div className="auth-left" style={{ width:'45%', background:`linear-gradient(145deg,${C.ink} 0%,${C.slate} 60%,#0D3B33 100%)`, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'48px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:`radial-gradient(circle at 20% 80%,${C.accent}22 0%,transparent 50%)`, pointerEvents:'none' }} />
          <div style={{ display:'flex', alignItems:'center', gap:'10px', position:'relative', zIndex:1 }}>
            <div style={{ width:'36px', height:'36px', background:`linear-gradient(135deg,${C.accent},${C.accentL})`, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🧾</div>
            <div>
              <div style={{ color:'#fff', fontSize:'18px', fontWeight:'700' }}>FaidhaTrack</div>
              <div style={{ color:C.accentL, fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase' }}>Invoice Manager</div>
            </div>
          </div>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ color:C.gold, fontSize:'11px', fontWeight:'600', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'16px' }}>Built for Kenyan SMEs</div>
            <div style={{ color:'#fff', fontSize:'34px', fontWeight:'800', lineHeight:'1.15', marginBottom:'16px' }}>Get paid faster.<br/>Stay organized.</div>
            <div style={{ color:'#94A3B8', fontSize:'14px', lineHeight:'1.6' }}>Send professional invoices, track payments, and understand your cash flow — designed for how Nairobi businesses actually work.</div>
            <div style={{ display:'flex', gap:'28px', marginTop:'36px' }}>
              {[['KES','Multi-currency'],['AI','Cash flow insights'],['Free','To get started']].map(([n,l]) => (
                <div key={n} style={{ borderLeft:`2px solid ${C.accent}`, paddingLeft:'12px' }}>
                  <div style={{ color:'#fff', fontSize:'20px', fontWeight:'800' }}>{n}</div>
                  <div style={{ color:'#94A3B8', fontSize:'11px', marginTop:'2px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'18px', position:'relative', zIndex:1 }}>
            <div style={{ color:'#CBD5E1', fontSize:'13px', fontStyle:'italic', lineHeight:'1.6' }}>"Before this, I was using WhatsApp to remind clients about payments. Now I just send a link and money lands in my account."</div>
            <div style={{ color:C.accentL, fontSize:'12px', fontWeight:'600', marginTop:'8px' }}>— James M., Freelance Designer, Westlands</div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="auth-right" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px' }}>
          <div className="auth-card" style={{ width:'100%', maxWidth:'400px' }}>

            {/* Mobile logo — only visible on mobile */}
            <div style={{ textAlign:'center', marginBottom:'28px' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'36px', height:'36px', background:`linear-gradient(135deg,${C.accent},${C.accentL})`, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🧾</div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:'18px', fontWeight:'800', color:C.ink }}>FaidhaTrack</div>
                  <div style={{ fontSize:'10px', color:C.accentL, letterSpacing:'1.5px', textTransform:'uppercase' }}>Invoice Manager</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize:'22px', fontWeight:'800', color:C.ink, marginBottom:'6px' }}>
              {tab==='login' ? 'Welcome back' : 'Create your account'}
            </div>
            <div style={{ color:C.muted, fontSize:'14px', marginBottom:'24px' }}>
              {tab==='login' ? 'Sign in to manage your invoices.' : 'Join Kenyan businesses tracking payments smarter.'}
            </div>

            {/* TABS */}
            <div style={{ display:'flex', background:C.border, borderRadius:'10px', padding:'3px', marginBottom:'22px' }}>
              {['login','signup'].map(t => (
                <button key={t} onClick={() => { setTab(t); clear() }}
                  style={{ flex:1, padding:'8px', textAlign:'center', fontSize:'13px', fontWeight:'600', borderRadius:'8px', cursor:'pointer', border:'none',
                    background: tab===t ? C.card : 'transparent', color: tab===t ? C.ink : C.muted,
                    boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {t === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {error   && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'8px', padding:'10px 14px', color:C.danger, fontSize:'13px', marginBottom:'14px' }}>⚠️ {error}</div>}
            {success && <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'8px', padding:'10px 14px', color:'#166534', fontSize:'13px', marginBottom:'14px' }}>✅ {success}</div>}

            {tab === 'login' ? (
              <>
                <Field label="Email address" type="email" placeholder="you@business.co.ke" value={lf.email} onChange={e => setLf({...lf, email:e.target.value})} />
                <Field label="Password" type="password" placeholder="••••••••" value={lf.password} onChange={e => setLf({...lf, password:e.target.value})} />
                <div style={{ textAlign:'right', marginTop:'-8px', marginBottom:'14px' }}>
                  <span style={{ fontSize:'12px', color:C.accent, cursor:'pointer', fontWeight:'600' }}>Forgot password?</span>
                </div>
                <button style={{ width:'100%', padding:'12px', background:`linear-gradient(135deg,${C.accent},${C.accentL})`, color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', opacity:loading?0.7:1 }}
                  onClick={handleLogin} disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in →'}
                </button>
              </>
            ) : (
              <>
                <Field label="Your name" placeholder="James Mwangi" value={sf.name} onChange={e => setSf({...sf, name:e.target.value})} />
                <Field label="Business name (optional)" placeholder="Mwangi Graphics Ltd" value={sf.business} onChange={e => setSf({...sf, business:e.target.value})} />
                <Field label="Email address" type="email" placeholder="you@business.co.ke" value={sf.email} onChange={e => setSf({...sf, email:e.target.value})} />
                <Field label="Password" type="password" placeholder="Min. 6 characters" value={sf.password} onChange={e => setSf({...sf, password:e.target.value})} />
                <button style={{ width:'100%', padding:'12px', background:`linear-gradient(135deg,${C.accent},${C.accentL})`, color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', opacity:loading?0.7:1 }}
                  onClick={handleSignup} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account →'}
                </button>
              </>
            )}

            <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'18px 0', color:C.muted, fontSize:'12px' }}>
              <div style={{ flex:1, height:'1px', background:C.border }} /> or <div style={{ flex:1, height:'1px', background:C.border }} />
            </div>

            <button onClick={handleGoogle}
              style={{ width:'100%', padding:'10px', background:C.card, border:`1.5px solid ${C.border}`, borderRadius:'8px', fontSize:'13px', fontWeight:'600', color:C.ink, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ marginTop:'18px', textAlign:'center', fontSize:'12px', color:C.muted }}>
              By continuing you agree to our <span style={{ color:C.accent, cursor:'pointer' }}>Terms</span> and <span style={{ color:C.accent, cursor:'pointer' }}>Privacy Policy</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
