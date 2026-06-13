import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'

const COLORS = ['#0F7B6C','#6366F1','#F4A020','#E76F51','#2A9D8F','#264653','#F4A261']
const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })
const initials = name => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
const badgeStyle = s => ({ paid:'#DCFCE7|#166534', unpaid:'#FEF9C3|#854D0E', overdue:'#FEE2E2|#991B1B', draft:'#F1F5F9|#475569' }[s] || '#F1F5F9|#475569').split('|')
const badgeLabel = s => ({ paid:'✓ Paid', unpaid:'⏳ Unpaid', overdue:'🚨 Overdue', draft:'📝 Draft' }[s] || s)

// ── CHART: SVG Line Chart ─────────────────────────────────────────────────────
function LineChart({ data, color = '#0F7B6C', height = 120 }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color:'#9CA3AF', fontSize:'13px' }}>
      Not enough data yet — create more invoices to see the trend.
    </div>
  )
  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const W = 600, H = height
  const pad = { t:10, r:10, b:24, l:50 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  const points = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * innerW,
    y: pad.t + ((max - d.value) / range) * innerH,
    ...d
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length-1].x} ${H - pad.b} L ${points[0].x} ${H - pad.b} Z`

  const [tooltip, setTooltip] = useState(null)

  return (
    <div style={{ position:'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Y-axis gridlines */}
        {[0,0.25,0.5,0.75,1].map(t => {
          const y = pad.t + t * innerH
          const val = max - t * range
          return (
            <g key={t}>
              <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">
                {val >= 1000 ? `${Math.round(val/1000)}K` : Math.round(val)}
              </text>
            </g>
          )
        })}
        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* X-axis labels */}
        {points.map((p, i) => (
          i % Math.ceil(points.length / 6) === 0 || i === points.length - 1 ? (
            <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill="#9CA3AF">{p.label}</text>
          ) : null
        ))}
        {/* Dots + hover */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#fff" strokeWidth="2"
              style={{ cursor:'pointer' }}
              onMouseEnter={() => setTooltip(p)}
              onMouseLeave={() => setTooltip(null)} />
          </g>
        ))}
      </svg>
      {/* Tooltip */}
      {tooltip && (
        <div style={{ position:'absolute', top:'0', left:'50%', transform:'translateX(-50%)', background:'#1A1A2E', color:'#fff', padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', pointerEvents:'none', whiteSpace:'nowrap', zIndex:10 }}>
          {tooltip.label}: {fmt(tooltip.value)}
        </div>
      )}
    </div>
  )
}

// ── CHART: Bar Chart ──────────────────────────────────────────────────────────
function BarChart({ data, height = 120 }) {
  if (!data || !data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height, padding:'0 4px' }}>
      {data.map((d, i) => {
        const h = Math.max(Math.round((d.value / max) * (height - 24)), d.value > 0 ? 4 : 0)
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}
            title={`${d.label}: ${fmt(d.value)}`}>
            <div style={{ fontSize:'10px', color:'#6B7280', fontWeight:'600' }}>{d.value > 0 ? (d.value >= 1000 ? `${Math.round(d.value/1000)}K` : d.value) : ''}</div>
            <div style={{ width:'100%', height:`${h}px`, background:d.color || '#0F7B6C', borderRadius:'4px 4px 0 0', transition:'height 0.3s ease' }} />
            <div style={{ fontSize:'10px', color:'#6B7280', fontWeight:'500', textAlign:'center', lineHeight:'1.2' }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── CHART: Donut ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 100 }) {
  const total = segments.reduce((s, g) => s + g.value, 0)
  if (!total) return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#9CA3AF' }}>
      No data
    </div>
  )
  const r = 40, cx = 50, cy = 50, stroke = 28
  let cumAngle = -90
  const arcs = segments.map(seg => {
    const pct = seg.value / total
    const angle = pct * 360
    const start = cumAngle
    cumAngle += angle
    const startRad = (start * Math.PI) / 180
    const endRad = ((start + angle) * Math.PI) / 180
    const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad),   y2 = cy + r * Math.sin(endRad)
    const large = angle > 180 ? 1 : 0
    return { ...seg, pct: Math.round(pct * 100), path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}` }
  })
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      {arcs.map((arc, i) => arc.value > 0 && (
        <path key={i} d={arc.path} fill="none" stroke={arc.color} strokeWidth={stroke}
          strokeLinecap="butt" style={{ transition:'stroke-dashoffset 0.5s' }} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="800" fill="#1A1A2E">{Math.round((segments.find(s=>s.label==='Paid')?.value||0)/total*100)}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#9CA3AF">paid</text>
    </svg>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard({ session, onNav }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [modal, setModal]       = useState(false)
  const [toast, setToast]       = useState('')
  const [form, setForm]         = useState({ client:'', amount:'', due:'', status:'unpaid', desc:'' })
  const user = session.user

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!error) setInvoices(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  const saveInvoice = async () => {
    if (!form.client || !form.amount || !form.due) { showToast('⚠️ Fill in client, amount and due date'); return }
    setSaving(true)
    const num = `INV-${String(invoices.length + 1).padStart(3,'0')}`
    const { error } = await sb.from('invoices').insert({
      user_id: user.id, client_name: form.client, invoice_number: num,
      amount: parseFloat(form.amount), currency:'KES', status: form.status,
      due_date: form.due, issue_date: new Date().toISOString().split('T')[0],
      description: form.desc || null,
    })
    setSaving(false)
    if (error) { showToast('❌ ' + error.message); return }
    setModal(false)
    setForm({ client:'', amount:'', due:'', status:'unpaid', desc:'' })
    showToast(`✅ ${num} saved!`)
    loadInvoices()
  }

  const markPaid = async (id, current) => {
    const next = current === 'paid' ? 'unpaid' : 'paid'
    await sb.from('invoices').update({ status: next }).eq('id', id)
    showToast(`Marked as ${next}`)
    loadInvoices()
  }

  const deleteInvoice = async (id, num) => {
    await sb.from('invoices').delete().eq('id', id)
    showToast(`🗑️ ${num} deleted`)
    loadInvoices()
  }

  // ── DERIVED STATS ───────────────────────────────────────────────────────────
  const paid    = invoices.filter(i => i.status === 'paid')
  const unpaid  = invoices.filter(i => i.status === 'unpaid')
  const overdue = invoices.filter(i => i.status === 'overdue')
  const draft   = invoices.filter(i => i.status === 'draft')
  const totalRev  = paid.reduce((s,i)    => s + Number(i.amount), 0)
  const totalOut  = unpaid.reduce((s,i)  => s + Number(i.amount), 0)
  const totalOver = overdue.reduce((s,i) => s + Number(i.amount), 0)
  const payRate   = invoices.length ? Math.round((paid.length / invoices.length) * 100) : 0

  // ── MONTHLY REVENUE TREND (last 6 months) ──────────────────────────────────
  const monthlyTrend = (() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString('en-KE', { month:'short' })
      const value = invoices
        .filter(inv => inv.status === 'paid' && inv.created_at?.startsWith(key))
        .reduce((s, inv) => s + Number(inv.amount), 0)
      months.push({ key, label, value })
    }
    return months
  })()

  // ── TOP CLIENTS BY BILLED AMOUNT ───────────────────────────────────────────
  const topClients = (() => {
    const map = {}
    invoices.forEach(inv => {
      if (!map[inv.client_name]) map[inv.client_name] = { total:0, paid:0, count:0 }
      map[inv.client_name].total += Number(inv.amount)
      if (inv.status === 'paid') map[inv.client_name].paid += Number(inv.amount)
      map[inv.client_name].count++
    })
    return Object.entries(map)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a,b) => b.total - a.total)
      .slice(0, 5)
  })()

  // ── MONTHLY INVOICE COUNT ──────────────────────────────────────────────────
  const monthlyCount = (() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString('en-KE', { month:'short' })
      const allInv   = invoices.filter(inv => inv.created_at?.startsWith(key))
      const paidInv  = allInv.filter(inv => inv.status === 'paid')
      months.push({ label, value: allInv.length, paid: paidInv.length, color: '#0F7B6C' })
    }
    return months
  })()

  // ── STATUS DONUT ───────────────────────────────────────────────────────────
  const donutData = [
    { label:'Paid',    value: paid.length,    color:'#0F7B6C' },
    { label:'Unpaid',  value: unpaid.length,  color:'#FDE68A' },
    { label:'Overdue', value: overdue.length, color:'#FCA5A5' },
    { label:'Draft',   value: draft.length,   color:'#E2E8F0' },
  ]

  const S = {
    page:       { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    topbar:     { background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0 24px', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
    content:    { flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' },
    card:       { background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' },
    cardHead:   { padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #E5E7EB' },
    cardBody:   { padding:'18px' },
    btnPrimary: { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff' },
    btnGhost:   { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'1.5px solid #E5E7EB', background:'#F7F8FA', color:'#1A1A2E' },
    fi:         { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', outline:'none', fontFamily:'inherit', color:'#1A1A2E', boxSizing:'border-box' },
    overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
    modal:      { background:'#fff', borderRadius:'14px', padding:'26px', width:'460px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  }

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={{ fontSize:'17px', fontWeight:'800', letterSpacing:'-0.3px' }}>Dashboard</div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button style={S.btnGhost} onClick={loadInvoices}>🔄 Refresh</button>
          <button style={S.btnPrimary} onClick={() => setModal(true)}>+ New Invoice</button>
        </div>
      </div>

      <div style={S.content}>

        {/* ── STAT CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
          {[
            { label:'Total Revenue',  value:fmt(totalRev),   sub:`${paid.length} paid`,      icon:'💰', color:'#0F7B6C' },
            { label:'Outstanding',    value:fmt(totalOut),   sub:`${unpaid.length} pending`,  icon:'⏳', color:'#F4A020' },
            { label:'Overdue',        value:fmt(totalOver),  sub:`${overdue.length} clients`, icon:'🚨', color:'#DC2626' },
            { label:'Payment Rate',   value:`${payRate}%`,   sub:`${invoices.length} total`,  icon:'📊', color: payRate >= 70 ? '#059669' : '#D97706' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'18px', borderTop:`3px solid ${s.color}`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'14px', right:'14px', fontSize:'20px', opacity:0.12 }}>{s.icon}</div>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'22px', fontWeight:'800', letterSpacing:'-0.5px', color:s.color }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize:'12px', color:'#6B7280', marginTop:'4px' }}>{loading ? '...' : s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── ROW 2: TREND LINE + DONUT ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'18px' }}>

          {/* MONTHLY REVENUE TREND */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>Revenue Trend</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Paid invoices — last 6 months</div>
              </div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#0F7B6C' }}>{fmt(totalRev)}</div>
            </div>
            <div style={S.cardBody}>
              <LineChart data={monthlyTrend} color="#0F7B6C" height={130} />
            </div>
          </div>

          {/* STATUS DONUT */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>Invoice Status</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Breakdown by status</div>
              </div>
            </div>
            <div style={{ padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px' }}>
              <DonutChart segments={donutData} size={110} />
              <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'7px' }}>
                {donutData.map(d => (
                  <div key={d.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                      <div style={{ width:'9px', height:'9px', borderRadius:'2px', background:d.color, flexShrink:0 }} />
                      <span style={{ fontSize:'12px', color:'#6B7280', fontWeight:'500' }}>{d.label}</span>
                    </div>
                    <span style={{ fontSize:'12px', fontWeight:'700', color:'#1A1A2E' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: TOP CLIENTS + MONTHLY COUNT ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>

          {/* TOP CLIENTS */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>Top Clients</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>By total billed amount</div>
              </div>
            </div>
            <div style={{ padding:'0' }}>
              {!topClients.length ? (
                <div style={{ padding:'28px', textAlign:'center', color:'#9CA3AF', fontSize:'13px' }}>No clients yet</div>
              ) : topClients.map((c, i) => {
                const pct = c.total > 0 ? Math.round((c.paid / c.total) * 100) : 0
                const color = COLORS[i % COLORS.length]
                return (
                  <div key={c.name} style={{ padding:'12px 18px', borderBottom: i < topClients.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'7px' }}>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:'#fff', flexShrink:0 }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:'700', color:'#1A1A2E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize:'11px', color:'#6B7280' }}>{c.count} invoice{c.count!==1?'s':''} · {pct}% paid</div>
                      </div>
                      <div style={{ fontSize:'13px', fontWeight:'800', color:'#1A1A2E', flexShrink:0 }}>{fmt(c.total)}</div>
                    </div>
                    {/* Payment progress bar */}
                    <div style={{ height:'4px', background:'#F1F5F9', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'2px', transition:'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* MONTHLY INVOICE COUNT */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>Invoices Created</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Monthly volume — last 6 months</div>
              </div>
            </div>
            <div style={S.cardBody}>
              <BarChart data={monthlyCount} height={150} />
            </div>
          </div>
        </div>

        {/* ── ROW 4: RECENT INVOICES + OVERDUE ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:'18px' }}>

          {/* RECENT INVOICES */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>Recent Invoices</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>{loading ? 'Loading...' : `${invoices.length} total`}</div>
              </div>
              <button style={{ ...S.btnGhost, fontSize:'12px', padding:'5px 11px' }} onClick={() => onNav && onNav('invoices')}>View all</button>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F7F8FA' }}>
                  {['Client','Invoice #','Amount','Status',''].map(h => (
                    <th key={h} style={{ fontSize:'10px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.6px', padding:'9px 16px', textAlign:'left', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding:'28px', textAlign:'center', color:'#6B7280', fontStyle:'italic' }}>⏳ Loading...</td></tr>
                ) : !invoices.length ? (
                  <tr><td colSpan="5" style={{ padding:'36px', textAlign:'center', color:'#6B7280' }}>No invoices yet — create your first one! 👆</td></tr>
                ) : invoices.slice(0,6).map((inv, i) => {
                  const color = COLORS[i % COLORS.length]
                  const [bg, fg] = badgeStyle(inv.status)
                  return (
                    <tr key={inv.id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'700', color:'#fff', flexShrink:0 }}>{initials(inv.client_name)}</div>
                          <span style={{ fontWeight:'600', fontSize:'13px' }}>{inv.client_name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'11px 16px', color:'#6B7280', fontSize:'12px', fontFamily:'monospace' }}>{inv.invoice_number}</td>
                      <td style={{ padding:'11px 16px', fontWeight:'700', fontSize:'13px' }}>{fmt(inv.amount)}</td>
                      <td style={{ padding:'11px 16px' }}><span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:bg, color:fg }}>{badgeLabel(inv.status)}</span></td>
                      <td style={{ padding:'11px 16px' }}>
                        <button onClick={() => markPaid(inv.id, inv.status)} style={{ background:'none', border:'1px solid #E5E7EB', borderRadius:'6px', padding:'3px 9px', fontSize:'11px', cursor:'pointer', color:'#6B7280', fontWeight:'600' }}>
                          {inv.status==='paid' ? 'Unmark' : 'Mark paid'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* RIGHT: OVERDUE + QUICK ACTIONS */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* AI INSIGHTS */}
            <div style={{ background:'linear-gradient(135deg,#0D3B33,#16213E)', borderRadius:'12px', padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                <span style={{ fontSize:'18px' }}>🤖</span>
                <div>
                  <div style={{ color:'#fff', fontSize:'13px', fontWeight:'700' }}>AI Insights</div>
                  <div style={{ color:'#94A3B8', fontSize:'11px' }}>Powered by Claude</div>
                </div>
              </div>
              {[
                overdue.length ? `${overdue.length} invoice${overdue.length>1?'s are':' is'} overdue — send reminders now.` : 'No overdue invoices — great work! 🎉',
                `Payment rate is ${payRate}% — ${payRate >= 70 ? 'healthy!' : 'consider following up on unpaid invoices.'}`,
                invoices.length ? `${topClients[0]?.name || 'Your top client'} is your highest-value client.` : 'Create invoices to get insights.',
              ].map((tip, i) => (
                <div key={i} style={{ display:'flex', gap:'8px', marginBottom:'9px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#13A88F', marginTop:'5px', flexShrink:0 }} />
                  <div style={{ color:'#CBD5E1', fontSize:'12px', lineHeight:'1.5' }}>{tip}</div>
                </div>
              ))}
              <button onClick={() => onNav && onNav('insights')}
                style={{ width:'100%', padding:'9px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', marginTop:'4px' }}>
                Run full analysis →
              </button>
            </div>

            {/* OVERDUE */}
            <div style={S.card}>
              <div style={S.cardHead}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700' }}>🚨 Overdue</div>
                  <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Needs follow-up</div>
                </div>
              </div>
              {!overdue.length
                ? <div style={{ padding:'20px', textAlign:'center', color:'#6B7280', fontSize:'13px' }}>No overdue invoices 🎉</div>
                : overdue.map(inv => (
                  <div key={inv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid #E5E7EB' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:'600' }}>{inv.client_name}</div>
                      <div style={{ fontSize:'11px', color:'#DC2626', fontWeight:'500' }}>{daysSince(inv.due_date)} days late</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:'#DC2626' }}>{fmt(inv.amount)}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={S.overlay} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={S.modal}>
            <div style={{ fontSize:'17px', fontWeight:'800', marginBottom:'18px' }}>➕ New Invoice</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Client Name *</label>
                <input style={S.fi} placeholder="Kamau Supplies Ltd" value={form.client} onChange={e => setForm({...form, client:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Amount (KES) *</label>
                <input style={S.fi} type="number" placeholder="15000" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Due Date *</label>
                <input style={S.fi} type="date" value={form.due} onChange={e => setForm({...form, due:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Status</label>
                <select style={S.fi} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                  <option value="unpaid">Unpaid</option><option value="paid">Paid</option>
                  <option value="overdue">Overdue</option><option value="draft">Draft</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Description</label>
                <input style={S.fi} placeholder="Web design services..." value={form.desc} onChange={e => setForm({...form, desc:e.target.value})} />
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'18px' }}>
              <button style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', opacity:saving?0.7:1 }} onClick={saveInvoice} disabled={saving}>
                {saving ? 'Saving...' : 'Create Invoice'}
              </button>
              <button style={S.btnGhost} onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:'22px', right:'22px', background:'#1A1A2E', color:'#fff', padding:'11px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:'500', zIndex:200, pointerEvents:'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
