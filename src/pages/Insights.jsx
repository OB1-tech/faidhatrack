import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'

const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })

export default function Insights({ session }) {
  const [invoices, setInvoices]   = useState([])
  const [payments, setPayments]   = useState([])
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis]   = useState(null)
  const [error, setError]         = useState('')
  const [toast, setToast]         = useState('')
  const user = session.user

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: inv }, { data: pay }, { data: cli }] = await Promise.all([
      sb.from('invoices').select('*').eq('user_id', user.id),
      sb.from('payments').select('*').eq('user_id', user.id),
      sb.from('clients').select('*').eq('user_id', user.id),
    ])
    setInvoices(inv || [])
    setPayments(pay || [])
    setClients(cli || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const runAnalysis = async () => {
    if (!invoices.length) { showToast('⚠️ Create some invoices first to get insights'); return }
    setAnalyzing(true)
    setError('')
    setAnalysis(null)

    // Build a data summary to send to Claude
    const paid    = invoices.filter(i => i.status === 'paid')
    const unpaid  = invoices.filter(i => i.status === 'unpaid')
    const overdue = invoices.filter(i => i.status === 'overdue')
    const totalRev = paid.reduce((s,i) => s + Number(i.amount), 0)
    const totalOut = unpaid.reduce((s,i) => s + Number(i.amount), 0)
    const totalOvr = overdue.reduce((s,i) => s + Number(i.amount), 0)
    const payRate  = invoices.length ? Math.round((paid.length / invoices.length) * 100) : 0

    // Top clients by outstanding amount
    const clientOutstanding = invoices
      .filter(i => i.status !== 'paid')
      .reduce((acc, i) => { acc[i.client_name] = (acc[i.client_name] || 0) + Number(i.amount); return acc }, {})
    const topDebtors = Object.entries(clientOutstanding).sort((a,b) => b[1]-a[1]).slice(0,3)

    const prompt = `You are a financial advisor for a Kenyan small business using FaidhaTrack, an invoice and payment tracker.

Here is their current financial data:
- Total invoices: ${invoices.length}
- Paid: ${paid.length} invoices worth KES ${totalRev.toLocaleString()}
- Unpaid: ${unpaid.length} invoices worth KES ${totalOut.toLocaleString()}
- Overdue: ${overdue.length} invoices worth KES ${totalOvr.toLocaleString()}
- Payment rate: ${payRate}%
- Total clients: ${clients.length}
- Total payments recorded: ${payments.length}
- Top clients with outstanding balances: ${topDebtors.map(([name, amt]) => `${name} (KES ${amt.toLocaleString()})`).join(', ') || 'None'}

Respond ONLY with a valid JSON object (no markdown, no backticks, no explanation outside the JSON) in this exact structure:
{
  "health_score": <number 0-100>,
  "health_label": "<Excellent|Good|Fair|At Risk>",
  "summary": "<2 sentence plain-English summary of their financial health>",
  "insights": [
    { "type": "warning|tip|success", "title": "<short title>", "body": "<1-2 sentence actionable insight specific to their data>" },
    { "type": "warning|tip|success", "title": "<short title>", "body": "<1-2 sentence actionable insight>" },
    { "type": "warning|tip|success", "title": "<short title>", "body": "<1-2 sentence actionable insight>" },
    { "type": "tip", "title": "<short title>", "body": "<1-2 sentence Kenya-specific business advice>" }
  ],
  "action_items": ["<specific action 1>", "<specific action 2>", "<specific action 3>"]
}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setAnalysis(parsed)
    } catch (e) {
      setError('Analysis failed: ' + e.message)
    }
    setAnalyzing(false)
  }

  // Quick stats
  const paid    = invoices.filter(i => i.status === 'paid')
  const unpaid  = invoices.filter(i => i.status === 'unpaid')
  const overdue = invoices.filter(i => i.status === 'overdue')
  const totalRev = paid.reduce((s,i) => s + Number(i.amount), 0)
  const payRate  = invoices.length ? Math.round((paid.length / invoices.length) * 100) : 0

  const healthColor = score => score >= 80 ? '#059669' : score >= 60 ? '#0F7B6C' : score >= 40 ? '#D97706' : '#DC2626'
  const typeStyle = type => ({
    warning: { bg:'#FEF2F2', border:'#FECACA', icon:'⚠️', label:'Warning', color:'#991B1B' },
    tip:     { bg:'#EFF6FF', border:'#BFDBFE', icon:'💡', label:'Tip',     color:'#1E40AF' },
    success: { bg:'#F0FDF4', border:'#BBF7D0', icon:'✅', label:'Win',     color:'#166534' },
  }[type] || { bg:'#F7F8FA', border:'#E5E7EB', icon:'ℹ️', label:'Info', color:'#374151' })

  const S = {
    page:     { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    topbar:   { background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0 24px', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
    content:  { flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' },
    card:     { background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' },
    btnPrimary: { padding:'10px 20px', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff' },
  }

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div>
          <div style={{ fontSize:'17px', fontWeight:'800', letterSpacing:'-0.3px' }}>AI Insights</div>
          <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'1px' }}>Powered by Claude</div>
        </div>
        <button style={{ ...S.btnPrimary, opacity: analyzing ? 0.7 : 1, display:'flex', alignItems:'center', gap:'8px' }}
          onClick={runAnalysis} disabled={analyzing || loading}>
          {analyzing
            ? <><span style={{ display:'inline-block', width:'12px', height:'12px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /> Analyzing...</>
            : '🤖 Run AI Analysis'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      <div style={S.content}>
        {/* QUICK STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
          {[
            { label:'Revenue Collected', value:fmt(totalRev),    icon:'💰', color:'#0F7B6C' },
            { label:'Payment Rate',      value:`${payRate}%`,    icon:'📊', color: payRate >= 70 ? '#059669' : '#D97706' },
            { label:'Unpaid Invoices',   value:unpaid.length,    icon:'⏳', color:'#F4A020' },
            { label:'Overdue',           value:overdue.length,   icon:'🚨', color: overdue.length > 0 ? '#DC2626' : '#059669' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'18px', borderTop:`3px solid ${s.color}`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'14px', right:'14px', fontSize:'20px', opacity:0.12 }}>{s.icon}</div>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'22px', fontWeight:'800', color:s.color }}>{loading ? '—' : s.value}</div>
            </div>
          ))}
        </div>

        {/* HERO PROMPT (no analysis yet) */}
        {!analysis && !analyzing && (
          <div style={{ background:'linear-gradient(135deg,#0D3B33,#1A1A2E)', borderRadius:'16px', padding:'40px', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🤖</div>
            <div style={{ color:'#fff', fontSize:'20px', fontWeight:'800', marginBottom:'8px' }}>Claude AI Cash Flow Analysis</div>
            <div style={{ color:'#94A3B8', fontSize:'14px', lineHeight:'1.6', maxWidth:'480px', margin:'0 auto 24px' }}>
              Get a personalised financial health score, actionable insights, and Kenya-specific business advice based on your real invoice and payment data.
            </div>
            <button style={{ ...S.btnPrimary, fontSize:'14px', padding:'12px 28px', opacity: loading || !invoices.length ? 0.6 : 1 }}
              onClick={runAnalysis} disabled={analyzing || loading || !invoices.length}>
              {loading ? 'Loading your data...' : !invoices.length ? 'Add invoices first' : '🚀 Run Analysis Now'}
            </button>
            {!loading && !invoices.length && (
              <div style={{ color:'#64748B', fontSize:'12px', marginTop:'12px' }}>Create invoices on the Dashboard first, then come back here.</div>
            )}
          </div>
        )}

        {/* ANALYZING STATE */}
        {analyzing && (
          <div style={{ background:'linear-gradient(135deg,#0D3B33,#1A1A2E)', borderRadius:'16px', padding:'40px', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px', animation:'pulse 1.5s ease infinite' }}>🧠</div>
            <div style={{ color:'#fff', fontSize:'18px', fontWeight:'700', marginBottom:'8px' }}>Claude is analysing your data...</div>
            <div style={{ color:'#94A3B8', fontSize:'13px' }}>Reading your {invoices.length} invoices and {payments.length} payments</div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'12px', padding:'16px 20px', color:'#991B1B', fontSize:'13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ANALYSIS RESULTS */}
        {analysis && (
          <>
            {/* HEALTH SCORE */}
            <div style={{ background:'linear-gradient(135deg,#0D3B33,#1A1A2E)', borderRadius:'16px', padding:'28px', display:'grid', gridTemplateColumns:'auto 1fr', gap:'28px', alignItems:'center' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:`conic-gradient(${healthColor(analysis.health_score)} ${analysis.health_score * 3.6}deg, rgba(255,255,255,0.1) 0deg)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  <div style={{ width:'78px', height:'78px', borderRadius:'50%', background:'#0D3B33', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ color:'#fff', fontSize:'24px', fontWeight:'900', lineHeight:1 }}>{analysis.health_score}</div>
                    <div style={{ color:'#94A3B8', fontSize:'10px', fontWeight:'600' }}>/100</div>
                  </div>
                </div>
                <div style={{ color: healthColor(analysis.health_score), fontSize:'12px', fontWeight:'700', marginTop:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{analysis.health_label}</div>
              </div>
              <div>
                <div style={{ color:'#94A3B8', fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'8px' }}>Financial Health Score</div>
                <div style={{ color:'#fff', fontSize:'15px', lineHeight:'1.6' }}>{analysis.summary}</div>
              </div>
            </div>

            {/* INSIGHTS GRID */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'14px' }}>
              {analysis.insights?.map((ins, i) => {
                const t = typeStyle(ins.type)
                return (
                  <div key={i} style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'18px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'16px' }}>{t.icon}</span>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:t.color }}>{ins.title}</div>
                      <span style={{ marginLeft:'auto', fontSize:'10px', fontWeight:'600', color:t.color, background:`${t.border}`, padding:'2px 7px', borderRadius:'20px' }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize:'13px', color:'#374151', lineHeight:'1.5' }}>{ins.body}</div>
                  </div>
                )
              })}
            </div>

            {/* ACTION ITEMS */}
            <div style={S.card}>
              <div style={{ padding:'16px 18px', borderBottom:'1px solid #E5E7EB' }}>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>📋 Action Items</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Your next steps based on the analysis</div>
              </div>
              <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:'10px' }}>
                {analysis.action_items?.map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 14px', background:'#F7F8FA', borderRadius:'8px', border:'1px solid #E5E7EB' }}>
                    <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'11px', fontWeight:'700', flexShrink:0 }}>{i+1}</div>
                    <div style={{ fontSize:'13px', color:'#1A1A2E', lineHeight:'1.5', paddingTop:'2px' }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RE-RUN */}
            <div style={{ textAlign:'center', paddingBottom:'8px' }}>
              <button style={{ ...S.btnPrimary, background:'#F7F8FA', color:'#1A1A2E', border:'1.5px solid #E5E7EB', fontWeight:'600' }} onClick={runAnalysis}>
                🔄 Re-run Analysis
              </button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:'22px', right:'22px', background:'#1A1A2E', color:'#fff', padding:'11px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:'500', zIndex:200, pointerEvents:'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
