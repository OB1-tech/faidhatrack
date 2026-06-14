import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'

const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—'
const COLORS = ['#0F7B6C','#6366F1','#F4A020','#E76F51','#2A9D8F','#264653','#F4A261']
const initials = name => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
const badgeStyle = s => ({ paid:'#DCFCE7|#166534', unpaid:'#FEF9C3|#854D0E', overdue:'#FEE2E2|#991B1B', draft:'#F1F5F9|#475569' }[s]||'#F1F5F9|#475569').split('|')
const badgeLabel = s => ({ paid:'✓ Paid', unpaid:'⏳ Unpaid', overdue:'🚨 Overdue', draft:'📝 Draft' }[s]||s)

const FILTERS = ['all','unpaid','paid','overdue','draft']

export default function Invoices({ session }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')
  const [copied, setCopied]     = useState('')
  const [form, setForm]         = useState({ client:'', amount:'', due:'', status:'unpaid', desc:'', notes:'' })
  const user = session.user

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!error) setInvoices(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const saveInvoice = async () => {
    if (!form.client || !form.amount || !form.due) { showToast('⚠️ Fill in client, amount and due date'); return }
    setSaving(true)
    const num = `INV-${String(invoices.length + 1).padStart(3,'0')}`
    const { error } = await sb.from('invoices').insert({
      user_id: user.id, client_name: form.client, invoice_number: num,
      amount: parseFloat(form.amount), currency:'KES', status: form.status,
      due_date: form.due, issue_date: new Date().toISOString().split('T')[0],
      description: form.desc || null, notes: form.notes || null,
    })
    setSaving(false)
    if (error) { showToast('❌ ' + error.message); return }
    setModal(false)
    setForm({ client:'', amount:'', due:'', status:'unpaid', desc:'', notes:'' })
    showToast(`✅ ${num} created!`)
    load()
  }

  const updateStatus = async (id, status) => {
    await sb.from('invoices').update({ status }).eq('id', id)
    showToast(`Status updated to ${status}`)
    load()
  }

  const deleteInvoice = async (id, num) => {
    await sb.from('invoices').delete().eq('id', id)
    showToast(`🗑️ ${num} deleted`)
    load()
  }

  const copyLink = (num) => {
    const link = `${window.location.origin}/invoice/${num}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(num)
      showToast(`🔗 Link copied! Share it with your client.`)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  const filtered = invoices
    .filter(i => filter === 'all' || i.status === filter)
    .filter(i => !search || i.client_name.toLowerCase().includes(search.toLowerCase()) || i.invoice_number.toLowerCase().includes(search.toLowerCase()))

  // Summary counts
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? invoices.length : invoices.filter(i => i.status === f).length
    return acc
  }, {})

  const S = {
    page: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    topbar: { background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0 24px', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
    content: { flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' },
    card: { background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' },
    btnPrimary: { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff' },
    btnGhost: { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'1.5px solid #E5E7EB', background:'#F7F8FA', color:'#1A1A2E' },
    fi: { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', outline:'none', fontFamily:'inherit', color:'#1A1A2E', boxSizing:'border-box' },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
    modal: { background:'#fff', borderRadius:'14px', padding:'26px', width:'480px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' },
  }

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={{ fontSize:'17px', fontWeight:'800', letterSpacing:'-0.3px' }}>Invoices</div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...S.fi, width:'200px' }} />
          <button style={S.btnGhost} onClick={load}>🔄</button>
          <button style={S.btnPrimary} onClick={() => setModal(true)}>+ New Invoice</button>
        </div>
      </div>

      <div className='mobile-content-pad' style={S.content}>
        {/* FILTER TABS */}
        <div className="filter-tabs" style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', cursor:'pointer', border:'1.5px solid',
                background: filter===f ? '#0F7B6C' : '#fff',
                color: filter===f ? '#fff' : '#6B7280',
                borderColor: filter===f ? '#0F7B6C' : '#E5E7EB',
              }}>
              {f.charAt(0).toUpperCase()+f.slice(1)} <span style={{ opacity:0.7 }}>({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* INVOICES TABLE */}
        <div style={S.card}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7F8FA' }}>
                {['Client','Invoice #','Amount','Issue Date','Due Date','Status','Actions'].map(h => (
                  <th key={h} className={['Issue Date','Invoice #'].includes(h)?'table-hide-mobile':''} style={{ fontSize:'10px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.6px', padding:'10px 16px', textAlign:'left', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding:'40px', textAlign:'center', color:'#6B7280', fontStyle:'italic' }}>⏳ Loading...</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan="7" style={{ padding:'40px', textAlign:'center', color:'#6B7280' }}>
                  {search || filter!=='all' ? 'No invoices match your filter.' : 'No invoices yet — create your first one! 👆'}
                </td></tr>
              ) : filtered.map((inv, i) => {
                const color = COLORS[i % COLORS.length]
                const [bg, fg] = badgeStyle(inv.status)
                const publicLink = `${window.location.origin}/invoice/${inv.invoice_number}`
                return (
                  <tr key={inv.id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
                        <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:'#fff', flexShrink:0 }}>{initials(inv.client_name)}</div>
                        <div>
                          <div style={{ fontWeight:'600', fontSize:'13px' }}>{inv.client_name}</div>
                          <div style={{ fontSize:'11px', color:'#6B7280' }}>{inv.description || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'13px 16px', color:'#6B7280', fontSize:'12px', fontFamily:'monospace' }}>{inv.invoice_number}</td>
                    <td style={{ padding:'13px 16px', fontWeight:'700', fontSize:'13px' }}>{fmt(inv.amount)}</td>
                    <td style={{ padding:'13px 16px', fontSize:'12px', color:'#6B7280' }}>{fmtDate(inv.issue_date)}</td>
                    <td style={{ padding:'13px 16px', fontSize:'12px', color: inv.status==='overdue' ? '#DC2626' : '#6B7280', fontWeight: inv.status==='overdue' ? '600' : '400' }}>{fmtDate(inv.due_date)}</td>
                    <td style={{ padding:'13px 16px' }}>
                      <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                        style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', border:`1px solid ${bg.replace('|','').replace('#','#')}`, background:bg, color:fg, cursor:'pointer', outline:'none' }}>
                        <option value="unpaid">⏳ Unpaid</option>
                        <option value="paid">✓ Paid</option>
                        <option value="overdue">🚨 Overdue</option>
                        <option value="draft">📝 Draft</option>
                      </select>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                        {/* SHARE LINK BUTTON */}
                        <button onClick={() => copyLink(inv.invoice_number)}
                          title={`Share: ${publicLink}`}
                          style={{ display:'flex', alignItems:'center', gap:'4px', background: copied===inv.invoice_number ? '#DCFCE7' : '#F0FDF4', border:`1px solid ${copied===inv.invoice_number ? '#BBF7D0' : '#6EE7B7'}`, borderRadius:'6px', padding:'4px 10px', fontSize:'11px', cursor:'pointer', color: copied===inv.invoice_number ? '#166534' : '#059669', fontWeight:'600', transition:'all 0.15s' }}>
                          {copied===inv.invoice_number ? '✓ Copied' : '🔗 Share'}
                        </button>
                        <a href={publicLink} target="_blank" rel="noreferrer"
                          style={{ display:'flex', alignItems:'center', background:'#F7F8FA', border:'1px solid #E5E7EB', borderRadius:'6px', padding:'4px 10px', fontSize:'11px', cursor:'pointer', color:'#6B7280', fontWeight:'600', textDecoration:'none' }}>
                          👁 View
                        </a>
                        <button onClick={() => deleteInvoice(inv.id, inv.invoice_number)}
                          style={{ background:'none', border:'1px solid #FCA5A5', borderRadius:'6px', padding:'4px 8px', fontSize:'11px', cursor:'pointer', color:'#DC2626', fontWeight:'600' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* TOTAL SUMMARY */}
        {!loading && invoices.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
            {[
              { label:'Total Billed',   value: fmt(invoices.reduce((s,i)=>s+Number(i.amount),0)), color:'#6366F1' },
              { label:'Collected',      value: fmt(invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.amount),0)), color:'#059669' },
              { label:'Outstanding',    value: fmt(invoices.filter(i=>i.status==='unpaid').reduce((s,i)=>s+Number(i.amount),0)), color:'#D97706' },
              { label:'Overdue Amount', value: fmt(invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+Number(i.amount),0)), color:'#DC2626' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'10px', padding:'14px 16px', borderLeft:`3px solid ${s.color}` }}>
                <div style={{ fontSize:'11px', color:'#6B7280', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'4px' }}>{s.label}</div>
                <div style={{ fontSize:'18px', fontWeight:'800', color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {modal && (
        <div className='modal-overlay-mobile' style={S.overlay} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className='modal-box' style={S.modal}>
            <div style={{ fontSize:'17px', fontWeight:'800', marginBottom:'18px' }}>➕ New Invoice</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              {[
                { label:'Client Name *', key:'client', placeholder:'Kamau Supplies Ltd', full:true, type:'text' },
                { label:'Amount (KES) *', key:'amount', placeholder:'15000', full:false, type:'number' },
                { label:'Due Date *', key:'due', placeholder:'', full:false, type:'date' },
                { label:'Description', key:'desc', placeholder:'Web design services — June 2026', full:true, type:'text' },
                { label:'Notes', key:'notes', placeholder:'Any additional notes for the client...', full:true, type:'text' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : 'auto' }}>
                  <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>{f.label}</label>
                  <input style={S.fi} type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({...form, [f.key]:e.target.value})} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Status</label>
                <select style={S.fi} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', opacity:saving?0.7:1 }} onClick={saveInvoice} disabled={saving}>
                {saving ? 'Creating...' : 'Create Invoice'}
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
