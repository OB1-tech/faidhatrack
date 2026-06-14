import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'

const COLORS = ['#0F7B6C','#6366F1','#F4A020','#E76F51','#2A9D8F','#264653','#F4A261']
const initials = name => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })

export default function Clients({ session, onNav }) {
  const [clients, setClients]     = useState([])
  const [invoices, setInvoices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [clientModal, setClientModal] = useState(false)
  const [invoiceModal, setInvoiceModal] = useState(null) // holds the client object
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')
  const [search, setSearch]       = useState('')
  const [clientForm, setClientForm] = useState({ name:'', email:'', phone:'', business_name:'', address:'' })
  const [invoiceForm, setInvoiceForm] = useState({ amount:'', due:'', status:'unpaid', desc:'' })
  const user = session.user

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: inv }] = await Promise.all([
      sb.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      sb.from('invoices').select('client_id, amount, status').eq('user_id', user.id)
    ])
    setClients(c || [])
    setInvoices(inv || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // Save new client
  const saveClient = async () => {
    if (!clientForm.name) { showToast('⚠️ Client name is required'); return }
    setSaving(true)
    const { error } = await sb.from('clients').insert({
      ...clientForm,
      user_id: user.id,
      color: COLORS[clients.length % COLORS.length]
    })
    setSaving(false)
    if (error) { showToast('❌ ' + error.message); return }
    setClientModal(false)
    setClientForm({ name:'', email:'', phone:'', business_name:'', address:'' })
    showToast('✅ Client saved!')
    load()
  }

  // Save invoice for a specific client
  const saveInvoice = async () => {
    if (!invoiceForm.amount || !invoiceForm.due) {
      showToast('⚠️ Amount and due date are required'); return
    }
    setSaving(true)

    // Get current invoice count to generate number
    const { count } = await sb.from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const num = `INV-${String((count || 0) + 1).padStart(3, '0')}`

    const { error } = await sb.from('invoices').insert({
      user_id:        user.id,
      client_id:      invoiceModal.id,
      client_name:    invoiceModal.name,
      invoice_number: num,
      amount:         parseFloat(invoiceForm.amount),
      currency:       'KES',
      status:         invoiceForm.status,
      due_date:       invoiceForm.due,
      issue_date:     new Date().toISOString().split('T')[0],
      description:    invoiceForm.desc || null,
    })

    setSaving(false)
    if (error) { showToast('❌ ' + error.message); return }

    setInvoiceModal(null)
    setInvoiceForm({ amount:'', due:'', status:'unpaid', desc:'' })
    showToast(`✅ ${num} created for ${invoiceModal.name}!`)
    load()
  }

  const deleteClient = async (id, name) => {
    const { error } = await sb.from('clients').delete().eq('id', id)
    if (error) { showToast('❌ ' + error.message); return }
    showToast(`🗑️ ${name} removed`)
    load()
  }

  const clientStats = (clientId) => {
    const ci = invoices.filter(i => i.client_id === clientId)
    const total = ci.reduce((s, i) => s + Number(i.amount), 0)
    const paid  = ci.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
    return { count: ci.length, total, paid, outstanding: total - paid }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.business_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const S = {
    page:       { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
    topbar:     { background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0 24px', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
    content:    { flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:'20px' },
    card:       { background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' },
    btnPrimary: { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff' },
    btnGhost:   { padding:'8px 15px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'1.5px solid #E5E7EB', background:'#F7F8FA', color:'#1A1A2E' },
    input:      { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', outline:'none', fontFamily:'inherit', color:'#1A1A2E', boxSizing:'border-box' },
    overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
    modal:      { background:'#fff', borderRadius:'14px', padding:'26px', width:'460px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' },
  }

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={{ fontSize:'17px', fontWeight:'800', letterSpacing:'-0.3px' }}>Clients</div>
        <div style={{ display:'flex', gap:'10px' }}>
          <input placeholder="🔍 Search clients..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...S.input, width:'220px' }} />
          <button style={S.btnPrimary} onClick={() => setClientModal(true)}>+ New Client</button>
        </div>
      </div>

      <div className='mobile-content-pad' style={S.content}>
        {/* STATS ROW */}
        <div className="stats-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
          {[
            { label:'Total Clients', value: clients.length,                                                                        icon:'👥', color:'#0F7B6C' },
            { label:'Total Billed',  value: fmt(invoices.reduce((s,i) => s+Number(i.amount), 0)),                                  icon:'💰', color:'#6366F1' },
            { label:'Outstanding',   value: fmt(invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+Number(i.amount), 0)),       icon:'⏳', color:'#F4A020' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'18px', borderTop:`3px solid ${s.color}`, position:'relative' }}>
              <div style={{ position:'absolute', top:'14px', right:'14px', fontSize:'20px', opacity:0.12 }}>{s.icon}</div>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'22px', fontWeight:'800' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* CLIENT GRID */}
        <div style={S.card}>
          <div style={{ padding:'16px 18px', borderBottom:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'700' }}>All Clients</div>
              <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>
                {loading ? 'Loading...' : `${filtered.length} client${filtered.length!==1?'s':''}`}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#6B7280' }}>⏳ Loading from Supabase...</div>
          ) : !filtered.length ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#6B7280' }}>
              {search ? 'No clients match your search.' : 'No clients yet — add your first one! 👆'}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:'1px', background:'#E5E7EB' }}>
              {filtered.map((c, i) => {
                const stats = clientStats(c.id)
                const color = COLORS[i % COLORS.length]
                return (
                  <div key={c.id} style={{ background:'#fff', padding:'20px' }}>
                    {/* CLIENT HEADER */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:'#fff', flexShrink:0 }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight:'700', fontSize:'14px' }}>{c.name}</div>
                          <div style={{ fontSize:'12px', color:'#6B7280' }}>{c.business_name || 'Individual'}</div>
                        </div>
                      </div>
                      <button onClick={() => deleteClient(c.id, c.name)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#D1D5DB', fontSize:'16px', padding:'2px' }}>
                        🗑
                      </button>
                    </div>

                    {/* CONTACT INFO */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginBottom:'14px' }}>
                      {c.email   && <div style={{ fontSize:'12px', color:'#6B7280' }}>📧 {c.email}</div>}
                      {c.phone   && <div style={{ fontSize:'12px', color:'#6B7280' }}>📞 {c.phone}</div>}
                      {c.address && <div style={{ fontSize:'12px', color:'#6B7280' }}>📍 {c.address}</div>}
                    </div>

                    {/* STATS */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', padding:'12px', background:'#F7F8FA', borderRadius:'8px', marginBottom:'14px' }}>
                      <div>
                        <div style={{ fontSize:'10px', color:'#6B7280', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>Invoices</div>
                        <div style={{ fontSize:'18px', fontWeight:'800', color:'#1A1A2E' }}>{stats.count}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'10px', color:'#6B7280', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>Outstanding</div>
                        <div style={{ fontSize:'13px', fontWeight:'700', color: stats.outstanding > 0 ? '#D97706' : '#059669' }}>
                          {fmt(stats.outstanding)}
                        </div>
                      </div>
                    </div>

                    {/* NEW INVOICE BUTTON — properly wired */}
                    <button
                      onClick={() => {
                        setInvoiceForm({ amount:'', due:'', status:'unpaid', desc:'' })
                        setInvoiceModal(c)
                      }}
                      style={{ width:'100%', padding:'9px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
                      + New Invoice for {c.name.split(' ')[0]}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ADD CLIENT MODAL ── */}
      {clientModal && (
        <div className='modal-overlay-mobile' style={S.overlay} onClick={e => e.target===e.currentTarget && setClientModal(false)}>
          <div className='modal-box' style={S.modal}>
            <div style={{ fontSize:'17px', fontWeight:'800', marginBottom:'18px' }}>👥 New Client</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              {[
                { label:'Full Name *',     key:'name',          placeholder:'Joe Bonano',            full:true },
                { label:'Business Name',   key:'business_name', placeholder:'Bonano Supplies Ltd',   full:true },
                { label:'Email',           key:'email',         placeholder:'joe@company.co.ke',     full:false },
                { label:'Phone',           key:'phone',         placeholder:'+254 712 345 678',      full:false },
                { label:'Address',         key:'address',       placeholder:'Westlands, Nairobi',    full:true },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : 'auto' }}>
                  <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>{f.label}</label>
                  <input style={S.input} placeholder={f.placeholder} value={clientForm[f.key]}
                    onChange={e => setClientForm({...clientForm, [f.key]:e.target.value})} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'18px' }}>
              <button style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', opacity:saving?0.7:1 }}
                onClick={saveClient} disabled={saving}>
                {saving ? 'Saving...' : 'Save Client'}
              </button>
              <button style={S.btnGhost} onClick={() => setClientModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW INVOICE FOR CLIENT MODAL ── */}
      {invoiceModal && (
        <div className='modal-overlay-mobile' style={S.overlay} onClick={e => e.target===e.currentTarget && setInvoiceModal(null)}>
          <div className='modal-box' style={S.modal}>
            {/* CLIENT CONTEXT HEADER */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', padding:'14px 16px', background:'#F0FDF4', borderRadius:'10px', border:'1px solid #BBF7D0' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#0F7B6C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#fff', flexShrink:0 }}>
                {initials(invoiceModal.name)}
              </div>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#166534' }}>New Invoice for {invoiceModal.name}</div>
                <div style={{ fontSize:'12px', color:'#166534', opacity:0.8 }}>{invoiceModal.business_name || 'Individual client'}</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Amount (KES) *</label>
                <input style={S.input} type="number" placeholder="15000" value={invoiceForm.amount}
                  onChange={e => setInvoiceForm({...invoiceForm, amount:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Due Date *</label>
                <input style={S.input} type="date" value={invoiceForm.due}
                  onChange={e => setInvoiceForm({...invoiceForm, due:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Status</label>
                <select style={S.input} value={invoiceForm.status}
                  onChange={e => setInvoiceForm({...invoiceForm, status:e.target.value})}>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'5px' }}>Description</label>
                <input style={S.input} placeholder="Web design services — June 2026" value={invoiceForm.desc}
                  onChange={e => setInvoiceForm({...invoiceForm, desc:e.target.value})} />
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button
                style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', opacity:saving?0.7:1 }}
                onClick={saveInvoice} disabled={saving}>
                {saving ? 'Creating...' : `Create Invoice`}
              </button>
              <button style={S.btnGhost} onClick={() => setInvoiceModal(null)}>Cancel</button>
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
