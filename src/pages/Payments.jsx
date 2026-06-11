import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'

const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—'

export default function Payments({ session }) {
  const [payments, setPayments]   = useState([])
  const [invoices, setInvoices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')
  const [form, setForm]           = useState({ invoice_id:'', amount_paid:'', payment_method:'M-Pesa', reference:'' })
  const user = session.user

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: inv }] = await Promise.all([
      sb.from('payments').select('*, invoices(invoice_number, client_name, amount)').eq('user_id', user.id).order('paid_at', { ascending: false }),
      sb.from('invoices').select('id, invoice_number, client_name, amount, status').eq('user_id', user.id).neq('status','paid').order('created_at', { ascending: false })
    ])
    setPayments(p || [])
    setInvoices(inv || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const savePayment = async () => {
    if (!form.invoice_id || !form.amount_paid) { showToast('⚠️ Select an invoice and enter amount'); return }
    setSaving(true)
    const inv = invoices.find(i => i.id === form.invoice_id)
    const { error: pe } = await sb.from('payments').insert({
      invoice_id: form.invoice_id,
      user_id: user.id,
      amount_paid: parseFloat(form.amount_paid),
      payment_method: form.payment_method,
      reference: form.reference || null,
      paid_at: new Date().toISOString()
    })
    if (pe) { setSaving(false); showToast('❌ ' + pe.message); return }
    // Mark invoice as paid
    await sb.from('invoices').update({ status:'paid' }).eq('id', form.invoice_id)
    setSaving(false)
    setModal(false)
    setForm({ invoice_id:'', amount_paid:'', payment_method:'M-Pesa', reference:'' })
    showToast(`✅ Payment recorded for ${inv?.client_name}!`)
    load()
  }

  const deletePayment = async (id) => {
    const { error } = await sb.from('payments').delete().eq('id', id)
    if (error) { showToast('❌ ' + error.message); return }
    showToast('🗑️ Payment removed')
    load()
  }

  // Stats
  const totalPaid   = payments.reduce((s, p) => s + Number(p.amount_paid), 0)
  const mpesa       = payments.filter(p => p.payment_method === 'M-Pesa').reduce((s,p) => s+Number(p.amount_paid), 0)
  const thisMonth   = payments.filter(p => new Date(p.paid_at).getMonth() === new Date().getMonth())
    .reduce((s,p) => s+Number(p.amount_paid), 0)

  const methodColors = { 'M-Pesa':'#00A651', 'Bank Transfer':'#6366F1', 'Cash':'#F4A020', 'Cheque':'#64748B' }

  const S = {
    page: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    topbar: { background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0 24px', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
    content: { flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' },
    card: { background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' },
    btnPrimary: { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff' },
    btnGhost: { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'1.5px solid #E5E7EB', background:'#F7F8FA', color:'#1A1A2E' },
    input: { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', outline:'none', fontFamily:'inherit', color:'#1A1A2E', boxSizing:'border-box' },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
    modal: { background:'#fff', borderRadius:'14px', padding:'26px', width:'440px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  }

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={{ fontSize:'17px', fontWeight:'800', letterSpacing:'-0.3px' }}>Payments</div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button style={S.btnGhost} onClick={load}>🔄 Refresh</button>
          <button style={S.btnPrimary} onClick={() => setModal(true)}>+ Record Payment</button>
        </div>
      </div>

      <div style={S.content}>
        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
          {[
            { label:'Total Collected', value:fmt(totalPaid),   icon:'💰', color:'#0F7B6C' },
            { label:'This Month',      value:fmt(thisMonth),   icon:'📅', color:'#6366F1' },
            { label:'Via M-Pesa',      value:fmt(mpesa),       icon:'📱', color:'#00A651' },
            { label:'Transactions',    value:payments.length,  icon:'📋', color:'#F4A020' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'18px', borderTop:`3px solid ${s.color}`, position:'relative' }}>
              <div style={{ position:'absolute', top:'14px', right:'14px', fontSize:'20px', opacity:0.12 }}>{s.icon}</div>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'22px', fontWeight:'800' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:'18px' }}>
          {/* PAYMENTS TABLE */}
          <div style={S.card}>
            <div style={{ padding:'16px 18px', borderBottom:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>Payment History</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>{loading ? 'Loading...' : `${payments.length} transaction${payments.length!==1?'s':''}`}</div>
              </div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F7F8FA' }}>
                  {['Client','Invoice','Amount Paid','Method','Reference','Date',''].map(h => (
                    <th key={h} style={{ fontSize:'10px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.6px', padding:'9px 16px', textAlign:'left', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ padding:'30px', textAlign:'center', color:'#6B7280', fontStyle:'italic' }}>⏳ Loading...</td></tr>
                ) : !payments.length ? (
                  <tr><td colSpan="7" style={{ padding:'40px', textAlign:'center', color:'#6B7280' }}>No payments recorded yet — record your first one! 👆</td></tr>
                ) : payments.map(p => {
                  const mColor = methodColors[p.payment_method] || '#6B7280'
                  return (
                    <tr key={p.id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'12px 16px', fontWeight:'600', fontSize:'13px' }}>{p.invoices?.client_name || '—'}</td>
                      <td style={{ padding:'12px 16px', color:'#6B7280', fontSize:'12px' }}>{p.invoices?.invoice_number || '—'}</td>
                      <td style={{ padding:'12px 16px', fontWeight:'700', fontSize:'13px', color:'#059669' }}>{fmt(p.amount_paid)}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:`${mColor}18`, color:mColor }}>
                          {p.payment_method === 'M-Pesa' ? '📱' : p.payment_method === 'Bank Transfer' ? '🏦' : p.payment_method === 'Cash' ? '💵' : '📄'} {p.payment_method}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'12px', color:'#6B7280' }}>{p.reference || '—'}</td>
                      <td style={{ padding:'12px 16px', fontSize:'12px', color:'#6B7280' }}>{fmtDate(p.paid_at)}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <button onClick={() => deletePayment(p.id)} style={{ background:'none', border:'1px solid #FCA5A5', borderRadius:'6px', padding:'3px 8px', fontSize:'11px', cursor:'pointer', color:'#DC2626', fontWeight:'600' }}>🗑</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* METHOD BREAKDOWN */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={S.card}>
              <div style={{ padding:'16px 18px', borderBottom:'1px solid #E5E7EB' }}>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>By Method</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>Payment method breakdown</div>
              </div>
              <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:'12px' }}>
                {Object.entries(methodColors).map(([method, color]) => {
                  const total = payments.filter(p => p.payment_method === method).reduce((s,p) => s+Number(p.amount_paid), 0)
                  const pct   = totalPaid > 0 ? Math.round((total/totalPaid)*100) : 0
                  return (
                    <div key={method}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                        <span style={{ fontSize:'12px', fontWeight:'600', color:'#1A1A2E' }}>{method}</span>
                        <span style={{ fontSize:'12px', color:'#6B7280' }}>{pct}%</span>
                      </div>
                      <div style={{ height:'6px', background:'#F1F5F9', borderRadius:'3px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'3px', transition:'width 0.5s ease' }} />
                      </div>
                      <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'3px' }}>{fmt(total)}</div>
                    </div>
                  )
                })}
                {!payments.length && <div style={{ textAlign:'center', color:'#6B7280', fontSize:'13px', padding:'12px 0' }}>No payments yet</div>}
              </div>
            </div>

            {/* UNPAID INVOICES */}
            <div style={S.card}>
              <div style={{ padding:'16px 18px', borderBottom:'1px solid #E5E7EB' }}>
                <div style={{ fontSize:'14px', fontWeight:'700' }}>⏳ Awaiting Payment</div>
                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>{invoices.length} unpaid invoice{invoices.length!==1?'s':''}</div>
              </div>
              <div>
                {!invoices.length
                  ? <div style={{ padding:'20px', textAlign:'center', color:'#6B7280', fontSize:'13px' }}>All invoices paid! 🎉</div>
                  : invoices.slice(0,5).map(inv => (
                    <div key={inv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:'600' }}>{inv.client_name}</div>
                        <div style={{ fontSize:'11px', color:'#6B7280' }}>{inv.invoice_number}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'13px', fontWeight:'700', color:'#D97706' }}>{fmt(inv.amount)}</div>
                        <button onClick={() => { setForm({...form, invoice_id:inv.id, amount_paid:inv.amount}); setModal(true) }}
                          style={{ fontSize:'11px', color:'#0F7B6C', fontWeight:'600', background:'none', border:'none', cursor:'pointer', marginTop:'2px' }}>
                          Record →
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={S.overlay} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={S.modal}>
            <div style={{ fontSize:'17px', fontWeight:'800', marginBottom:'18px' }}>💳 Record Payment</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Invoice *</label>
                <select style={S.input} value={form.invoice_id} onChange={e => {
                  const inv = invoices.find(i => i.id === e.target.value)
                  setForm({...form, invoice_id:e.target.value, amount_paid: inv?.amount || ''})
                }}>
                  <option value="">Select an invoice...</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.client_name} — {inv.invoice_number} ({fmt(inv.amount)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Amount Paid (KES) *</label>
                <input style={S.input} type="number" placeholder="15000" value={form.amount_paid} onChange={e => setForm({...form, amount_paid:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Payment Method</label>
                <select style={S.input} value={form.payment_method} onChange={e => setForm({...form, payment_method:e.target.value})}>
                  <option>M-Pesa</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Reference / Transaction ID</label>
                <input style={S.input} placeholder="e.g. QHX7Y2KL9P (M-Pesa code)" value={form.reference} onChange={e => setForm({...form, reference:e.target.value})} />
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', opacity:saving?0.7:1 }} onClick={savePayment} disabled={saving}>
                {saving ? 'Saving...' : 'Record Payment'}
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
