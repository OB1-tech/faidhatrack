import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' }) : '—'

const statusStyle = s => ({
  paid:    { bg:'#DCFCE7', color:'#166534', label:'✓ PAID',    border:'#BBF7D0' },
  unpaid:  { bg:'#FEF9C3', color:'#854D0E', label:'⏳ UNPAID',  border:'#FDE68A' },
  overdue: { bg:'#FEE2E2', color:'#991B1B', label:'🚨 OVERDUE', border:'#FECACA' },
  draft:   { bg:'#F1F5F9', color:'#475569', label:'📝 DRAFT',   border:'#E2E8F0' },
}[s] || { bg:'#F1F5F9', color:'#475569', label:s, border:'#E2E8F0' })

export default function InvoicePublic() {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [paid, setPaid]       = useState(false)

  // Extract invoice number from URL: /invoice/INV-001
  const invoiceNumber = window.location.pathname.split('/invoice/')[1]?.toUpperCase()

  useEffect(() => {
    if (!invoiceNumber) { setError('No invoice specified.'); setLoading(false); return }
    sb.from('invoices')
      .select('*, clients(name, email, phone, business_name, address)')
      .eq('invoice_number', invoiceNumber)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('Invoice not found. Please check the link.')
        else setInvoice(data)
        setLoading(false)
      })
  }, [invoiceNumber])

  const handleMarkPaid = async () => {
    const { error: err } = await sb.from('invoices').update({ status: 'paid' }).eq('id', invoice.id)
    if (!err) { setInvoice({ ...invoice, status: 'paid' }); setPaid(true) }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F8FA', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🧾</div>
        <div style={{ color:'#6B7280', fontSize:'14px' }}>Loading invoice...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F8FA', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:'center', maxWidth:'360px' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔍</div>
        <div style={{ fontSize:'18px', fontWeight:'700', color:'#1A1A2E', marginBottom:'8px' }}>Invoice Not Found</div>
        <div style={{ color:'#6B7280', fontSize:'14px', lineHeight:'1.6' }}>{error}</div>
        <div style={{ marginTop:'20px', fontSize:'12px', color:'#9CA3AF' }}>Powered by FaidhaTrack</div>
      </div>
    </div>
  )

  const st = statusStyle(invoice.status)
  const isOverdue = invoice.status === 'overdue'
  const isPaid    = invoice.status === 'paid'
  const daysOverdue = invoice.due_date ? Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000) : 0

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter','Segoe UI',sans-serif", padding:'40px 20px' }}>
      <div style={{ maxWidth:'680px', margin:'0 auto' }}>

        {/* PAID BANNER */}
        {paid && (
          <div style={{ background:'#DCFCE7', border:'1px solid #BBF7D0', borderRadius:'12px', padding:'14px 20px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'20px' }}>🎉</span>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#166534' }}>Payment confirmed!</div>
              <div style={{ fontSize:'12px', color:'#166534', opacity:0.8 }}>This invoice has been marked as paid.</div>
            </div>
          </div>
        )}

        {/* OVERDUE BANNER */}
        {isOverdue && !paid && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'12px', padding:'14px 20px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'20px' }}>🚨</span>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#991B1B' }}>This invoice is {daysOverdue} day{daysOverdue!==1?'s':''} overdue</div>
              <div style={{ fontSize:'12px', color:'#991B1B', opacity:0.8 }}>Please arrange payment as soon as possible.</div>
            </div>
          </div>
        )}

        {/* INVOICE CARD */}
        <div style={{ background:'#fff', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', overflow:'hidden' }}>

          {/* HEADER */}
          <div style={{ background:'linear-gradient(135deg,#1A1A2E,#0D3B33)', padding:'32px 36px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🧾</div>
                <div>
                  <div style={{ color:'#fff', fontSize:'16px', fontWeight:'700' }}>FaidhaTrack</div>
                  <div style={{ color:'#13A88F', fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase' }}>Invoice Manager</div>
                </div>
              </div>
              <div style={{ color:'#94A3B8', fontSize:'12px', marginBottom:'4px' }}>Invoice Number</div>
              <div style={{ color:'#fff', fontSize:'28px', fontWeight:'900', letterSpacing:'-0.5px' }}>{invoice.invoice_number}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <span style={{ display:'inline-block', padding:'6px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', background:st.bg, color:st.color, border:`1px solid ${st.border}`, letterSpacing:'0.5px' }}>
                {st.label}
              </span>
              <div style={{ color:'#94A3B8', fontSize:'11px', marginTop:'16px' }}>Issue Date</div>
              <div style={{ color:'#fff', fontSize:'13px', fontWeight:'600' }}>{fmtDate(invoice.issue_date)}</div>
              <div style={{ color:'#94A3B8', fontSize:'11px', marginTop:'8px' }}>Due Date</div>
              <div style={{ color: isOverdue ? '#FCA5A5' : '#fff', fontSize:'13px', fontWeight:'600' }}>{fmtDate(invoice.due_date)}</div>
            </div>
          </div>

          <div style={{ padding:'32px 36px' }}>

            {/* FROM / TO */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'32px' }}>
              <div>
                <div style={{ fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>From</div>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#1A1A2E', marginBottom:'4px' }}>Your Business</div>
                <div style={{ fontSize:'13px', color:'#6B7280', lineHeight:'1.6' }}>
                  via FaidhaTrack<br />
                  Nairobi, Kenya
                </div>
              </div>
              <div>
                <div style={{ fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>Bill To</div>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#1A1A2E', marginBottom:'4px' }}>{invoice.client_name}</div>
                {invoice.clients && (
                  <div style={{ fontSize:'13px', color:'#6B7280', lineHeight:'1.6' }}>
                    {invoice.clients.business_name && <>{invoice.clients.business_name}<br /></>}
                    {invoice.clients.email && <>{invoice.clients.email}<br /></>}
                    {invoice.clients.phone && <>{invoice.clients.phone}<br /></>}
                    {invoice.clients.address && <>{invoice.clients.address}</>}
                  </div>
                )}
              </div>
            </div>

            {/* LINE ITEMS TABLE */}
            <div style={{ border:'1px solid #E5E7EB', borderRadius:'10px', overflow:'hidden', marginBottom:'24px' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F7F8FA' }}>
                    <th style={{ padding:'12px 16px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid #E5E7EB' }}>Description</th>
                    <th style={{ padding:'12px 16px', textAlign:'right', fontSize:'11px', fontWeight:'600', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid #E5E7EB', width:'160px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding:'16px', fontSize:'14px', color:'#1A1A2E' }}>
                      <div style={{ fontWeight:'600' }}>{invoice.description || 'Services Rendered'}</div>
                      {invoice.notes && <div style={{ fontSize:'12px', color:'#6B7280', marginTop:'4px' }}>{invoice.notes}</div>}
                    </td>
                    <td style={{ padding:'16px', textAlign:'right', fontSize:'14px', fontWeight:'700', color:'#1A1A2E' }}>{fmt(invoice.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TOTALS */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'32px' }}>
              <div style={{ width:'260px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:'13px', color:'#6B7280', borderBottom:'1px solid #E5E7EB' }}>
                  <span>Subtotal</span><span>{fmt(invoice.amount)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:'13px', color:'#6B7280', borderBottom:'1px solid #E5E7EB' }}>
                  <span>Tax (0%)</span><span>KES 0.00</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', fontSize:'16px', fontWeight:'800', color:'#1A1A2E' }}>
                  <span>Total Due</span>
                  <span style={{ color:'#0F7B6C' }}>{fmt(invoice.amount)}</span>
                </div>
              </div>
            </div>

            {/* PAYMENT CTA */}
            {!isPaid && (
              <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'12px', padding:'20px 24px', marginBottom:'24px' }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#166534', marginBottom:'4px' }}>💳 Payment Instructions</div>
                <div style={{ fontSize:'13px', color:'#166534', lineHeight:'1.6', marginBottom:'16px' }}>
                  Please send payment via M-Pesa or bank transfer and share the transaction reference with your service provider.
                </div>
                <button onClick={handleMarkPaid}
                  style={{ padding:'10px 24px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                  ✓ Confirm Payment Made
                </button>
              </div>
            )}

            {/* FOOTER */}
            <div style={{ borderTop:'1px solid #E5E7EB', paddingTop:'20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:'12px', color:'#9CA3AF' }}>
                Thank you for your business! 🙏
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'18px', height:'18px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>🧾</div>
                <span style={{ fontSize:'11px', color:'#9CA3AF', fontWeight:'500' }}>Powered by FaidhaTrack</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRINT BUTTON */}
        <div style={{ textAlign:'center', marginTop:'20px' }}>
          <button onClick={() => window.print()}
            style={{ background:'none', border:'1px solid #E5E7EB', borderRadius:'8px', padding:'8px 20px', fontSize:'13px', color:'#6B7280', cursor:'pointer', fontWeight:'500' }}>
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  )
}
