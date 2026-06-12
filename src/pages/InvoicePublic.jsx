import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const fmt = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' }) : '—'

const statusStyle = s => ({
  paid:    { bg:'#DCFCE7', color:'#166534', label:'✓ PAID',    border:'#BBF7D0' },
  unpaid:  { bg:'#FEF9C3', color:'#854D0E', label:'UNPAID',    border:'#FDE68A' },
  overdue: { bg:'#FEE2E2', color:'#991B1B', label:'OVERDUE',   border:'#FECACA' },
  draft:   { bg:'#F1F5F9', color:'#475569', label:'DRAFT',     border:'#E2E8F0' },
}[s] || { bg:'#F1F5F9', color:'#475569', label:s, border:'#E2E8F0' })

export default function InvoicePublic() {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed]   = useState(false)

  const invoiceNumber = window.location.pathname.split('/invoice/')[1]?.toUpperCase()

  useEffect(() => {
    if (!invoiceNumber) { setError('No invoice specified.'); setLoading(false); return }
    sb.from('invoices')
      .select('*, clients(name, email, phone, business_name, address)')
      .eq('invoice_number', invoiceNumber)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('Invoice not found. Please check the link.')
        else { setInvoice(data); if (data.status === 'paid') setConfirmed(true) }
        setLoading(false)
      })
  }, [invoiceNumber])

  const handleConfirmPayment = async () => {
    setConfirming(true)
    await sb.from('invoices').update({ status: 'paid' }).eq('id', invoice.id)
    setInvoice({ ...invoice, status: 'paid' })
    setConfirmed(true)
    setConfirming(false)
  }

  const handleDownloadPDF = () => window.print()

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
    <>
      {/* ── PRINT STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Segoe UI', sans-serif; background: #F7F8FA; }

        /* Hide action buttons and banners when printing */
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .invoice-card { box-shadow: none !important; border: 1px solid #E5E7EB !important; }
          .page-wrap { padding: 0 !important; background: #fff !important; }
          @page {
            size: A4;
            margin: 12mm 14mm;
          }
        }
      `}</style>

      <div className="page-wrap" style={{ minHeight:'100vh', background:'#F7F8FA', padding:'32px 20px', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
        <div style={{ maxWidth:'700px', margin:'0 auto' }}>

          {/* ── ACTION BAR (hidden on print) ── */}
          <div className="no-print" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', padding:'14px 18px', background:'#fff', borderRadius:'12px', border:'1px solid #E5E7EB', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:'13px', color:'#6B7280' }}>
              Invoice <strong style={{ color:'#1A1A2E' }}>{invoice.invoice_number}</strong> · {fmtDate(invoice.issue_date)}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={handleDownloadPDF}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                ⬇️ Download PDF
              </button>
              <button onClick={() => window.print()}
                style={{ padding:'8px 16px', background:'#F7F8FA', border:'1px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', fontWeight:'600', color:'#6B7280', cursor:'pointer' }}>
                🖨️ Print
              </button>
            </div>
          </div>

          {/* ── STATUS BANNERS (hidden on print) ── */}
          {confirmed && (
            <div className="no-print" style={{ background:'#DCFCE7', border:'1px solid #BBF7D0', borderRadius:'12px', padding:'14px 20px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'20px' }}>🎉</span>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#166534' }}>Payment confirmed!</div>
                <div style={{ fontSize:'12px', color:'#166534', opacity:0.8 }}>This invoice has been marked as paid.</div>
              </div>
            </div>
          )}

          {isOverdue && !confirmed && (
            <div className="no-print" style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'12px', padding:'14px 20px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'20px' }}>🚨</span>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#991B1B' }}>This invoice is {daysOverdue} day{daysOverdue!==1?'s':''} overdue</div>
                <div style={{ fontSize:'12px', color:'#991B1B', opacity:0.8 }}>Please arrange payment as soon as possible.</div>
              </div>
            </div>
          )}

          {/* ── INVOICE CARD ── */}
          <div className="invoice-card" style={{ background:'#fff', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', overflow:'hidden' }}>

            {/* HEADER */}
            <div style={{ background:'linear-gradient(135deg,#1A1A2E,#0D3B33)', padding:'32px 36px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                  <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🧾</div>
                  <div>
                    <div style={{ color:'#fff', fontSize:'16px', fontWeight:'700' }}>FaidhaTrack</div>
                    <div style={{ color:'#13A88F', fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase' }}>Invoice Manager</div>
                  </div>
                </div>
                <div style={{ color:'#94A3B8', fontSize:'11px', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'1px' }}>Invoice Number</div>
                <div style={{ color:'#fff', fontSize:'30px', fontWeight:'900', letterSpacing:'-0.5px' }}>{invoice.invoice_number}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <span style={{ display:'inline-block', padding:'7px 18px', borderRadius:'20px', fontSize:'12px', fontWeight:'800', background:st.bg, color:st.color, border:`1px solid ${st.border}`, letterSpacing:'1px', textTransform:'uppercase' }}>
                  {st.label}
                </span>
                <div style={{ marginTop:'20px' }}>
                  <div style={{ color:'#94A3B8', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.8px' }}>Issue Date</div>
                  <div style={{ color:'#fff', fontSize:'13px', fontWeight:'600', marginTop:'3px' }}>{fmtDate(invoice.issue_date)}</div>
                </div>
                <div style={{ marginTop:'12px' }}>
                  <div style={{ color:'#94A3B8', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.8px' }}>Due Date</div>
                  <div style={{ color: isOverdue ? '#FCA5A5' : '#fff', fontSize:'13px', fontWeight:'600', marginTop:'3px' }}>{fmtDate(invoice.due_date)}</div>
                </div>
              </div>
            </div>

            <div style={{ padding:'36px' }}>

              {/* FROM / TO */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px', marginBottom:'36px', paddingBottom:'28px', borderBottom:'1px solid #F1F5F9' }}>
                <div>
                  <div style={{ fontSize:'11px', fontWeight:'700', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'12px' }}>From</div>
                  <div style={{ fontSize:'15px', fontWeight:'800', color:'#1A1A2E', marginBottom:'6px' }}>Your Business</div>
                  <div style={{ fontSize:'13px', color:'#6B7280', lineHeight:'1.7' }}>
                    via FaidhaTrack<br />
                    Nairobi, Kenya
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:'11px', fontWeight:'700', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'12px' }}>Bill To</div>
                  <div style={{ fontSize:'15px', fontWeight:'800', color:'#1A1A2E', marginBottom:'6px' }}>{invoice.client_name}</div>
                  {invoice.clients && (
                    <div style={{ fontSize:'13px', color:'#6B7280', lineHeight:'1.7' }}>
                      {invoice.clients.business_name && <>{invoice.clients.business_name}<br /></>}
                      {invoice.clients.email         && <>{invoice.clients.email}<br /></>}
                      {invoice.clients.phone         && <>{invoice.clients.phone}<br /></>}
                      {invoice.clients.address       && <>{invoice.clients.address}</>}
                    </div>
                  )}
                </div>
              </div>

              {/* LINE ITEMS */}
              <div style={{ border:'1px solid #E5E7EB', borderRadius:'10px', overflow:'hidden', marginBottom:'24px' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#F7F8FA' }}>
                      <th style={{ padding:'13px 18px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid #E5E7EB' }}>Description</th>
                      <th style={{ padding:'13px 18px', textAlign:'right', fontSize:'11px', fontWeight:'700', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid #E5E7EB', width:'180px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding:'18px', fontSize:'14px', color:'#1A1A2E' }}>
                        <div style={{ fontWeight:'600', marginBottom:'4px' }}>{invoice.description || 'Services Rendered'}</div>
                        {invoice.notes && <div style={{ fontSize:'12px', color:'#6B7280', lineHeight:'1.5' }}>{invoice.notes}</div>}
                      </td>
                      <td style={{ padding:'18px', textAlign:'right', fontSize:'15px', fontWeight:'800', color:'#1A1A2E' }}>{fmt(invoice.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TOTALS */}
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'32px' }}>
                <div style={{ width:'280px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', fontSize:'13px', color:'#6B7280', borderBottom:'1px solid #F1F5F9' }}>
                    <span>Subtotal</span><span style={{ fontWeight:'600' }}>{fmt(invoice.amount)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', fontSize:'13px', color:'#6B7280', borderBottom:'1px solid #F1F5F9' }}>
                    <span>Tax (0%)</span><span>KES 0.00</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 0 0', fontSize:'17px', fontWeight:'900', color:'#1A1A2E' }}>
                    <span>Total Due</span>
                    <span style={{ color: isPaid ? '#059669' : '#0F7B6C' }}>{fmt(invoice.amount)}</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT CTA — hidden on print if paid */}
              {!isPaid && (
                <div className="no-print" style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'12px', padding:'20px 24px', marginBottom:'24px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#166534', marginBottom:'6px' }}>💳 Payment Instructions</div>
                  <div style={{ fontSize:'13px', color:'#166534', lineHeight:'1.6', marginBottom:'16px' }}>
                    Please send payment via M-Pesa or bank transfer and share the transaction reference with your service provider.
                  </div>
                  <button onClick={handleConfirmPayment} disabled={confirming}
                    style={{ padding:'10px 24px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', opacity:confirming?0.7:1 }}>
                    {confirming ? 'Confirming...' : '✓ Confirm Payment Made'}
                  </button>
                </div>
              )}

              {/* PAID WATERMARK on PDF */}
              {isPaid && (
                <div style={{ textAlign:'center', marginBottom:'24px' }}>
                  <span style={{ display:'inline-block', padding:'8px 28px', borderRadius:'8px', border:'3px solid #059669', color:'#059669', fontSize:'18px', fontWeight:'900', letterSpacing:'4px', textTransform:'uppercase', opacity:0.7, transform:'rotate(-2deg)' }}>
                    PAID
                  </span>
                </div>
              )}

              {/* FOOTER */}
              <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:'20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:'12px', color:'#9CA3AF' }}>Thank you for your business 🙏</div>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'16px', height:'16px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', borderRadius:'3px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px' }}>🧾</div>
                  <span style={{ fontSize:'11px', color:'#9CA3AF', fontWeight:'500' }}>Powered by FaidhaTrack</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM DOWNLOAD BUTTON (no-print) */}
          <div className="no-print" style={{ textAlign:'center', marginTop:'20px', paddingBottom:'40px' }}>
            <button onClick={handleDownloadPDF}
              style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'11px 28px', background:'linear-gradient(135deg,#0F7B6C,#13A88F)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(15,123,108,0.3)' }}>
              ⬇️ Download as PDF
            </button>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginTop:'8px' }}>Opens print dialog — select "Save as PDF" as destination</div>
          </div>
        </div>
      </div>
    </>
  )
}
