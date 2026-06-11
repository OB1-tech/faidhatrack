import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'

const COLORS = ['#0F7B6C','#6366F1','#F4A020','#E76F51','#2A9D8F','#264653','#F4A261']
const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })
const initials = name => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
const daysSince = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
const badgeStyle = s => ({ paid:'#DCFCE7|#166534', unpaid:'#FEF9C3|#854D0E', overdue:'#FEE2E2|#991B1B', draft:'#F1F5F9|#475569' }[s] || '#F1F5F9|#475569').split('|')
const badgeLabel = s => ({ paid:'✓ Paid', unpaid:'⏳ Unpaid', overdue:'🚨 Overdue', draft:'📝 Draft' }[s] || s)

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

  const paid      = invoices.filter(i => i.status === 'paid')
  const unpaid    = invoices.filter(i => i.status === 'unpaid')
  const overdue   = invoices.filter(i => i.status === 'overdue')
  const totalRev  = paid.reduce((s,i)    => s + Number(i.amount), 0)
  const totalOut  = unpaid.reduce((s,i)  => s + Number(i.amount), 0)
  const totalOver = overdue.reduce((s,i) => s + Number(i.amount), 0)

  const chartGroups = [
    { label:'Paid',    total:totalRev,  color:'#0F7B6C' },
    { label:'Unpaid',  total:totalOut,  color:'#FDE68A' },
    { label:'Overdue', total:totalOver, color:'#FCA5A5' },
    { label:'Draft',   total:invoices.filter(i=>i.status==='draft').reduce((s,i)=>s+Number(i.amount),0), color:'#E2E8F0' },
  ]
  const maxChart = Math.max(...chartGroups.map(g => g.total), 1)

  const S = {
    page:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    topbar:{ background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0 24px', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
    content:{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' },
    statsGrid:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' },
    bottomGrid:{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'18px' },
    card:{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' },
    cardHeader:{ padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #E5E7EB' },
    btnPrimary:{ padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff' },
    btnGhost:{ padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'1.5px solid #E5E7EB', background:'#F7F8FA', color:'#1A1A2E' },
    overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
    modal:{ background:'#fff', borderRadius:'14px', padding:'26px', width:'460px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
    fi:{ width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', outline:'none', fontFamily:'inherit', color:'#1A1A2E', boxSizing:'border-box' },
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
        {/* STATS */}
        <div style={S.statsGrid}>
          {[
            { label:'Total Revenue',  value:fmt(totalRev),    sub:`${paid.length} paid invoices`,   icon:'💰', color:'#0F7B6C' },
            { label:'Outstanding',    value:fmt(totalOut),    sub:`${unpaid.length} pending`,        icon:'⏳', color:'#F4A020' },
            { label:'Overdue',        value:fmt(totalOver),   sub:`${overdue.length} overdue`,       icon:'🚨', color:'#DC2626' },
            { label:'Total Invoices', value:invoices.length,  sub:'All time',                        icon:'📋', color:'#6366F1' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'18px', borderTop:`3px solid ${s.color}`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'14px', right:'14px', fontSize:'20px', opacity:0.12 }}>{s.icon}</div>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'22px', fontWeight:'800', letterSpacing:'-0.5px' }}>{s.value}</div>
              <div style={{ fontSize:'12px', color:'#6B7280', marginTop:'4px' }}>{loading ? 'Loading...' : s.sub}</div>
            </div>
          ))}
        </div>

        <div style={S.bottomGrid}>
          <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
            {/* TABLE */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700' }}>Recent Invoices</div>
                  <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>{loading ? 'Loading...' : `${invoices.length} invoice${invoices.length!==1?'s':''} from Supabase`}</div>
                </div>
                <button style={{ ...S.btnGhost, fontSize:'12px', padding:'5px 11px' }} onClick={() => onNav && onNav('invoices')}>View all</button>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F7F8FA' }}>
                    {['Client','Invoice #','Amount','Due Date','Status',''].map(h => (
                      <th key={h} style={{ fontSize:'10px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.6px', padding:'9px 16px', textAlign:'left', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ padding:'30px', textAlign:'center', color:'#6B7280', fontStyle:'italic' }}>⏳ Loading from Supabase...</td></tr>
                  ) : !invoices.length ? (
                    <tr><td colSpan="6" style={{ padding:'40px', textAlign:'center', color:'#6B7280' }}>No invoices yet — create your first one! 👆</td></tr>
                  ) : invoices.slice(0,8).map((inv, i) => {
                    const color = COLORS[i % COLORS.length]
                    const [bg, fg] = badgeStyle(inv.status)
                    return (
                      <tr key={inv.id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
                            <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:'#fff', flexShrink:0 }}>{initials(inv.client_name)}</div>
                            <div>
                              <div style={{ fontWeight:'600', fontSize:'13px' }}>{inv.client_name}</div>
                              <div style={{ fontSize:'11px', color:'#6B7280' }}>{inv.description || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px', color:'#6B7280', fontSize:'12px' }}>{inv.invoice_number}</td>
                        <td style={{ padding:'12px 16px', fontWeight:'700', fontSize:'13px' }}>{fmt(inv.amount)}</td>
                        <td style={{ padding:'12px 16px', fontSize:'12px', color:'#6B7280' }}>{inv.due_date || '—'}</td>
                        <td style={{ padding:'12px 16px' }}><span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:bg, color:fg }}>{badgeLabel(inv.status)}</span></td>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button onClick={() => markPaid(inv.id, inv.status)} style={{ background:'none', border:'1px solid #E5E7EB', borderRadius:'6px', padding:'3px 9px', fontSize:'11px', cursor:'pointer', color:'#6B7280', fontWeight:'600' }}>
                              {inv.status==='paid' ? 'Unmark' : 'Mark paid'}
                            </button>
                            <button onClick={() => deleteInvoice(inv.id, inv.invoice_number)} style={{ background:'none', border:'1px solid #FCA5A5', borderRadius:'6px', padding:'3px 8px', fontSize:'11px', cursor:'pointer', color:'#DC2626', fontWeight:'600' }}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* CHART */}
            <div style={S.card}>
              <div style={S.cardHeader}><div><div style={{ fontSize:'14px', fontWeight:'700' }}>Revenue by Status</div><div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Invoice amounts grouped by status</div></div></div>
              <div style={{ padding:'18px' }}>
                <div style={{ display:'flex', alignItems:'flex-end', gap:'12px', height:'110px' }}>
                  {chartGroups.map(g => {
                    const h = Math.max(Math.round((g.total / maxChart) * 100), g.total > 0 ? 4 : 0)
                    return (
                      <div key={g.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                        <div style={{ height:'100px', display:'flex', alignItems:'flex-end', width:'100%' }}>
                          <div style={{ width:'100%', height:`${h}px`, background:g.color, borderRadius:'4px 4px 0 0' }} title={`${g.label}: ${fmt(g.total)}`} />
                        </div>
                        <div style={{ fontSize:'10px', color:'#6B7280', fontWeight:'500' }}>{g.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ background:'linear-gradient(135deg,#0D3B33,#16213E)', borderRadius:'12px', padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                <span style={{ fontSize:'18px' }}>🤖</span>
                <div><div style={{ color:'#fff', fontSize:'13px', fontWeight:'700' }}>AI Insights</div><div style={{ color:'#94A3B8', fontSize:'11px' }}>Powered by Claude</div></div>
              </div>
              {[
                overdue.length ? `${overdue.length} invoice${overdue.length>1?'s are':' is'} overdue — send reminders now.` : 'No overdue invoices — great work! 🎉',
                unpaid.length ? `KES ${totalOut.toLocaleString()} outstanding across ${unpaid.length} unpaid invoice${unpaid.length>1?'s':''}.` : 'All invoices are paid up.',
                invoices.length ? `${Math.round((paid.length / Math.max(invoices.length,1))*100)}% of your invoices have been paid.` : 'Create your first invoice to get insights.',
              ].map((tip, i) => (
                <div key={i} style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#13A88F', marginTop:'5px', flexShrink:0 }} />
                  <div style={{ color:'#CBD5E1', fontSize:'12px', lineHeight:'1.5' }}>{tip}</div>
                </div>
              ))}
              <button onClick={() => showToast('Full Claude AI analysis — Day 4! 🚀')} style={{ width:'100%', padding:'9px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', marginTop:'4px' }}>
                Run full analysis →
              </button>
            </div>

            <div style={S.card}>
              <div style={S.cardHeader}><div><div style={{ fontSize:'14px', fontWeight:'700' }}>🚨 Overdue</div><div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Needs follow-up</div></div></div>
              {!overdue.length
                ? <div style={{ padding:'28px', textAlign:'center', color:'#6B7280', fontSize:'13px' }}>No overdue invoices 🎉</div>
                : overdue.map(inv => (
                  <div key={inv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid #E5E7EB' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:'600' }}>{inv.client_name}</div>
                      <div style={{ fontSize:'11px', color:'#DC2626', fontWeight:'500' }}>{daysSince(inv.due_date)} days late</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:'#DC2626' }}>{fmt(inv.amount)}</div>
                      <button onClick={() => showToast(`Reminder sent to ${inv.client_name}! 📧`)} style={{ marginTop:'4px', background:'none', border:'1px solid #E5E7EB', borderRadius:'6px', padding:'3px 9px', fontSize:'11px', cursor:'pointer', color:'#6B7280', fontWeight:'600' }}>Remind</button>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* QUICK LINKS */}
            <div style={S.card}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid #E5E7EB' }}><div style={{ fontSize:'14px', fontWeight:'700' }}>Quick Actions</div></div>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:'8px' }}>
                {[
                  { label:'👥 Manage Clients', nav:'clients' },
                  { label:'💳 Record Payment', nav:'payments' },
                ].map(a => (
                  <button key={a.nav} onClick={() => onNav && onNav(a.nav)}
                    style={{ width:'100%', padding:'9px 12px', background:'#F7F8FA', border:'1px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', fontWeight:'600', color:'#1A1A2E', cursor:'pointer', textAlign:'left' }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={S.overlay} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={S.modal}>
            <div style={{ fontSize:'17px', fontWeight:'800', marginBottom:'18px' }}>➕ New Invoice</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
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
              <div>
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
