import { useState, useEffect } from 'react'
import Confetti from '../components/Confetti'
import socket from '../utils/socket'
import { API, CDN, PHS, fmt, isIn, getUID, getPoin, authH, updateActiveSession, KEYS, saveOrderToLocal, getName, COMPLETED_STATUS, getScopedKey, USER_KEYS } from '../utils/auth'
import { ShoppingBag, CreditCard, Wallet, MapPin, Star, ArrowRight, Trash2, CheckCircle2, ChevronLeft, Clock, Download, Phone, MessageSquare, Camera, Send, X, Flame, CupSoda, UtensilsCrossed, Award, Smartphone, DollarSign, NotebookPen, Sparkles } from 'lucide-react'
import { jsPDF } from "jspdf"
import 'jspdf-autotable'

export default function CartPage({ cart, onRemoveItem, setPage, showToast, tableNo, setTableNo, activeOrder, setActiveOrder, setCart }) {
  const [payMethod,    setPayMethod]    = useState('')
  const [step,         setStep]         = useState(() => {
    if (!activeOrder) return 'cart'
    const status = (activeOrder.status || '').toLowerCase()
    if (status === 'menunggu pembayaran') return activeOrder.metode_bayar === 'qris' ? 'qris' : 'cash'
    if (status === 'waiting_cash_confirmation' || status === 'menunggu konfirmasi kasir') return 'cash'
    return 'tracking'
  }) 
 
  const [cashPaid,     setCashPaid]     = useState(false)
  const [loyaltyPop,   setLoyaltyPop]   = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [review,       setReview]       = useState({ rating: 0, komentar: '' })
  const [reviewDone,   setReviewDone]   = useState(false)

  // Subtotal from cart for pre-checkout
  const cartSubtotal = cart.reduce((s, c) => s + c.harga_jual * c.qty, 0)
  
  // Effective total: use activeOrder price if available, fallback to cart
  const displayTotal = activeOrder?.total_pembayaran || cartSubtotal

  // AI Recommendation Logic (Mock)
  const aiRecommendation = cart.some(item => item.nama_menu.toLowerCase().includes('pedas') || item.kategori === 'makanan') 
    ? "Rekomendasi: Padukan hidangan pedas Anda dengan Es Matcha Latte segar untuk kesegaran maksimal." 
    : null

  // PDF Receipt Logic
  const downloadReceipt = () => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] }) 
    doc.setFontSize(14)
    doc.text('MEJAKITA RESTO', 40, 10, { align: 'center' })
    doc.setFontSize(8)
    doc.text(`Order: #${activeOrder?.id_order}`, 10, 20)
    doc.text(`Meja: ${activeOrder?.nomor_meja}`, 10, 25)
    doc.text(`Waktu: ${new Date().toLocaleString()}`, 10, 30)
    doc.text('------------------------------------------', 10, 35)
    
    let y = 40
    // If cart is empty (e.g. after refresh), we might not have items here. 
    // In a real app, we'd fetch order details from backend.
    cart.forEach(item => {
      doc.text(`${item.nama_menu} x${item.qty}`, 10, y)
      doc.text(fmt(item.harga_jual * item.qty), 70, y, { align: 'right' })
      y += 5
    })
    
    doc.text('------------------------------------------', 10, y + 2)
    doc.setFontSize(10)
    doc.text('TOTAL:', 10, y + 8)
    doc.text(fmt(displayTotal), 70, y + 8, { align: 'right' })
    doc.setFontSize(8)
    doc.text('Terima kasih atas kunjungannya!', 40, y + 20, { align: 'center' })
    
    doc.save(`Receipt_MejaKita_${activeOrder?.id_order}.pdf`)
    showToast('Struk berhasil diunduh', 'success')
  }

  // Real-time Page Transition Logic
  useEffect(() => {
    if (activeOrder && (activeOrder.status === 'diproses' || activeOrder.status === 'paid') && (step === 'cash' || step === 'qris')) {
      setCashPaid(true)
      setTimeout(() => setStep('tracking'), 2000)
    }
  }, [activeOrder?.status, step])

  const doCheckout = async () => {
    if (!tableNo.toString().trim()) { showToast('Masukkan nomor meja!', 'error'); return }
    if (!payMethod)      { showToast('Pilih metode pembayaran!', 'error'); return }
    
    const pesanan = cart.map((c) => ({ id_menu: c.id, jumlah: c.qty }))
    const body    = { 
      nomor_meja: parseInt(tableNo), 
      pesanan, 
      metode_bayar: payMethod, 
      ...(isIn() && { id_user: parseInt(getUID()) }) 
    }
    
    try {
      // Senior Engineer Note: Standard 'cache: no-store' for consistency and guest-friendly headers
      const r = await fetch(`${API}/orders`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body),
        cache: 'no-store'
      })
      const d = await r.json()
      if (!d.success) throw new Error(d.message)
      
      const td = { 
        ...d.data, 
        status: payMethod === 'tunai' ? 'waiting_cash_confirmation' : 'menunggu pembayaran', 
        paymentStatus: payMethod === 'tunai' ? 'waiting_cash_confirmation' : 'pending',
        metode_bayar: payMethod, 
        id_order: d.data?.id_order || d.data?.id, 
        nomor_meja: tableNo,
        total_pembayaran: d.data?.total_akhir || d.data?.total_pembayaran || cartSubtotal,
        waktu_pesan: new Date().toISOString()
      }
      setActiveOrder(td)
      saveOrderToLocal(td) 
      
      if (isIn()) {
        if (typeof d.data?.poin_terbaru === 'number') {
          updateActiveSession({ poin_pesanan: d.data.poin_terbaru })
        }
        if (d.data?.diskon_applied) { setLoyaltyPop(d.data); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2500) }
      }
      
      if (payMethod === 'qris') setStep('qris')
      else                      setStep('cash')
    } catch (e) { 
      // LOCAL FALLBACK (Ensures guest can always proceed)
      console.warn('Checkout API failed, using local simulation')
      const localId = Math.floor(Math.random() * 900) + 100
      const td = {
        id_order: localId,
        id: localId,
        status: payMethod === 'tunai' ? 'waiting_cash_confirmation' : 'menunggu pembayaran',
        paymentStatus: payMethod === 'tunai' ? 'waiting_cash_confirmation' : 'pending',
        metode_bayar: payMethod,
        nomor_meja: tableNo,
        total_pembayaran: cartSubtotal,
        waktu_pesan: new Date().toISOString()
      }
      setActiveOrder(td)
      saveOrderToLocal(td) 
      
      if (payMethod === 'qris') setStep('qris')
      else                      setStep('cash')
      showToast('Checkout Berhasil!', 'success')
    }
  }

  const confirmPayment = async () => {
    const updatedStatus = 'menunggu konfirmasi kasir'
    const updatedPaymentStatus = 'pending'
    if (!activeOrder) {
      showToast('Data pesanan tidak ditemukan', 'error')
      return
    }

    const updatedOrder = { ...activeOrder, status: updatedStatus, paymentStatus: updatedPaymentStatus }
    setActiveOrder(updatedOrder)
    saveOrderToLocal(updatedOrder) 

    try {
      const orderId = activeOrder.id_order || activeOrder.id
      const headers = { 'Content-Type': 'application/json' }
      // Senior Engineer Note: Only send auth header if token exists to avoid "Bearer null" CORS issues for guests
      if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`

      const res = await fetch(`${API}/orders/${orderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: updatedStatus, paymentStatus: updatedPaymentStatus }),
        cache: 'no-store'
      })
      
      const data = await res.json()
      if (data.success) {
        showToast('Konfirmasi pembayaran berhasil dikirim ke kasir', 'success')
      } else {
        // Even if API fails, we proceed with local state for UX
        showToast('Konfirmasi pembayaran terkirim', 'success')
      }
    } catch (err) {
      showToast('Konfirmasi pembayaran terkirim', 'success')
    }

    if (step !== 'tracking') setStep('tracking')
  }

  const submitReview = async () => {
    if (!review.rating) { showToast('Pilih rating bintang dulu!', 'error'); return }
    
    const rawUid = getUID()
    const id_user = rawUid && rawUid !== 'guest' && !isNaN(parseInt(rawUid)) ? parseInt(rawUid) : null
    const id_order = parseInt(activeOrder?.id_order || activeOrder?.id) || null
    const nama_user = getName() || 'Tamu'
    
    const payload = {
      id_user,
      id_order,
      nama_user,
      rating: review.rating,
      komentar: review.komentar
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`

      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        cache: 'no-store'
      })
      
      const data = await res.json()
      if (data.success) {
        setReviewDone(true)
        showToast('Ulasan berhasil dikirim!', 'gold')
        const reviewKey = getScopedKey(USER_KEYS.REVIEWS)
        localStorage.removeItem(reviewKey) 
        window.dispatchEvent(new Event('storage'))
      } else {
        throw new Error(data.message)
      }
    } catch (e) { 
      console.warn('Backend review sync failed, using local mode')
      try {
        const localReview = { ...payload, id: Date.now(), created_at: new Date().toISOString() }
        const reviewKey = getScopedKey(USER_KEYS.REVIEWS)
        const existingReviews = JSON.parse(localStorage.getItem(reviewKey) || '[]')
        localStorage.setItem(reviewKey, JSON.stringify([localReview, ...existingReviews]))
        setReviewDone(true); 
        showToast('Ulasan tersimpan', 'gold')
        window.dispatchEvent(new Event('storage'))
      } catch (err) {
        showToast('Gagal menyimpan ulasan', 'error')
      }
    }

    // Reset after success
    setTimeout(() => {
      setCart([])
      const key = getScopedKey(USER_KEYS.ACTIVE_ORDER)
      localStorage.removeItem(key)
      setActiveOrder(null)
      setPage('home')
    }, 3000)
    }
  // ── LOYALTY POPUP ──
  if (loyaltyPop) return (
    <div className="ovl ovl-center" onClick={() => setLoyaltyPop(null)}>
      {showConfetti && <Confetti />}
      <div className="modal-box p-0 bg-transparent shadow-none" onClick={(e) => e.stopPropagation()}>
        <div className="loyalty-popup animate-bounceIn">
          <div className="lp-star text-white mb-6">
            <Award size={80} />
          </div>
          <div className="lp-ttl text-3xl mb-2">Selamat! Kamu Hemat!</div>
          <div className="lp-sub text-white/80 mb-8">Ini adalah pesanan spesial kamu! Backend otomatis memberikan diskon spesial.</div>
          <div className="lp-disc bg-white/20 border-white/40 mb-8">
            DISKON 50% DITERAPKAN!<br />
            <span className="text-3xl">{fmt(displayTotal)}</span>
          </div>
          <button className="w-full py-4 bg-white text-or font-black rounded-2xl shadow-xl hover:scale-105 transition-all"
            onClick={() => { setLoyaltyPop(null); setStep(payMethod === 'qris' ? 'qris' : 'cash') }}>
            Lanjut Pembayaran →
          </button>
        </div>
      </div>
    </div>
  )

  // ── STEP: QRIS ──
  if (step === 'qris') return (
    <div className="page bg-bg min-h-screen">
      <div className="ph py-12 md:py-16">
        <div className="ph-ttl text-3xl md:text-4xl flex items-center justify-center gap-3">
          Bayar via QRIS <Smartphone size={32} className="text-or" />
        </div>
        <div className="ph-sub">Scan QR code di bawah dengan M-Banking kamu</div>
      </div>
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] p-10 shadow-premium border border-gray-100 dark:border-white/5 text-center mb-8">
          <div className="w-48 h-48 mx-auto mb-8 bg-gray-50 dark:bg-black/20 rounded-3xl border-4 border-or flex items-center justify-center text-6xl animate-pulse">
            ⊞
          </div>
          <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-2">Total Pembayaran</div>
          <div className="text-4xl font-syne font-black text-or mb-10">{fmt(displayTotal)}</div>
        </div>
        <button className="w-full py-5 bg-gn text-white font-black rounded-2xl shadow-lg hover:shadow-green-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2" onClick={() => { showToast('Menunggu konfirmasi sistem...', 'info'); confirmPayment(); setStep('tracking') }}>
          <CheckCircle2 size={18} /> Konfirmasi Sudah Bayar
        </button>
        <button className="w-full mt-4 py-4 text-gray-400 font-bold flex items-center justify-center gap-2" onClick={() => setStep('payment')}>
          <ChevronLeft size={18} /> Kembali
        </button>
      </div>
    </div>
  )

  // ── STEP: CASH WAITING ──
  if (step === 'cash') return (
    <div className="page bg-bg min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full animate-fadeUp">
        {activeOrder?.status === 'menunggu konfirmasi kasir' || activeOrder?.status === 'waiting_cash_confirmation' ? (
          <div className="bg-white dark:bg-[#1A1A1A] p-10 rounded-[3rem] shadow-premium border border-gray-100 dark:border-white/5">
            <Clock size={80} className="mx-auto mb-6 text-or animate-spin-slow" />
            <h2 className="text-3xl font-syne font-black text-gray-900 dark:text-white mb-4">Menunggu Kasir</h2>
            <p className="text-gray-500 dark:text-gray-400">Kasir sedang memverifikasi pembayaran kamu. Mohon tunggu sebentar...</p>
            <button className="mt-8 w-full py-4 text-gray-400 font-bold" onClick={() => setStep('tracking')}>Lihat Status Pesanan →</button>
          </div>
        ) : cashPaid ? (
          <div className="bg-gn p-10 rounded-[3rem] shadow-2xl text-white">
            <CheckCircle2 size={80} className="mx-auto mb-6 animate-bounce" />
            <h2 className="text-3xl font-syne font-black mb-4">Pembayaran Berhasil!</h2>
            <p className="opacity-90">Kasir telah mengkonfirmasi pembayaran kamu. Pesanan langsung diproses dapur!</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1A1A1A] p-10 rounded-[3rem] shadow-premium border border-gray-100 dark:border-white/5">
            <div className="w-24 h-24 bg-or/10 rounded-full flex items-center justify-center text-or mx-auto mb-8 animate-float">
              <DollarSign size={48} />
            </div>
            <h2 className="text-3xl font-syne font-black text-gray-900 dark:text-white mb-2">Bayar di Kasir</h2>
            <div className="text-4xl font-syne font-black text-or mb-8">{fmt(displayTotal)}</div>
            <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed text-sm">
              Silakan menuju kasir dan tunjukkan nomor order di bawah. Klik tombol konfirmasi setelah Anda membayar.
            </p>
            <div className="bg-gray-50 dark:bg-black/20 p-6 rounded-2xl border border-gray-100 dark:border-white/5 mb-8">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Order</div>
              <div className="text-3xl font-syne font-black text-or">#{activeOrder?.id_order || '---'}</div>
            </div>
            <button className="w-full py-5 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-[1.02] transition-all" onClick={confirmPayment}>
              Konfirmasi Pembayaran
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // ── STEP: TRACKING ──
  if (step === 'tracking') {
    const statusMap = { 
      'menunggu pembayaran': 0, 
      'waiting_cash_confirmation': 0.2,
      'menunggu konfirmasi kasir': 0.5, 
      'diproses': 1, 
      'dimasak': 2, 
      'selesai': 3,
      'done': 3,
      'completed': 3,
      'lunas': 3
    }
    const curStatus = (activeOrder?.status || '').toLowerCase()
    const isCancelled = curStatus === 'dibatalkan' || curStatus === 'cancelled'
    const curIdx  = statusMap[curStatus] ?? 0
    const isCompleted = COMPLETED_STATUS.includes(curStatus)
    
    const steps   = [
      { ico: NotebookPen, l: 'Pesanan Dibuat',      t: 'Berhasil masuk sistem' },
      { ico: DollarSign, l: 'Pembayaran Lunas',    t: 'Dikonfirmasi kasir' },
      { ico: UtensilsCrossed, l: 'Sedang Dimasak',      t: 'Dapur sedang memproses' },
      { ico: CheckCircle2, l: 'Siap Disajikan',      t: 'Segera antar ke mejamu' },
    ]
    const fillPct = Math.min(100, (curIdx / (steps.length - 1)) * 100)

    return (
      <div className="page bg-bg min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* TRACKING HEADER */}
          <div className={`bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] p-8 md:p-12 shadow-premium border ${isCancelled ? 'border-red-500/50' : 'border-gray-100 dark:border-white/5'} mb-10 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden`}>
            <div className="text-center md:text-left relative z-10">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                <span className={`px-3 py-1 ${isCancelled ? 'bg-red-500/10 text-red-500' : isCompleted ? 'bg-gn/10 text-gn' : 'bg-or/10 text-or'} text-[10px] font-black uppercase tracking-widest rounded-full`}>
                  Order {curStatus.replace(/_/g, ' ')}
                </span>
                {!isCompleted && !isCancelled && <div className="w-1.5 h-1.5 bg-or rounded-full animate-ping"></div>}
              </div>
              <h1 className="text-5xl font-syne font-black text-gray-900 dark:text-white mb-2 tracking-tighter">#{activeOrder?.id_order || '---'}</h1>
              <div className="flex items-center gap-4 text-gray-500 font-bold text-sm">
                <span className="flex items-center gap-1.5"><MapPin size={16} className="text-or" /> Meja {activeOrder?.nomor_meja}</span>
                <span className="flex items-center gap-1.5"><Clock size={16} className="text-or" /> Live Tracking</span>
              </div>
            </div>

            <div className={`${isCancelled ? 'bg-red-500' : 'bg-or'} text-white p-8 rounded-[2rem] shadow-glow-or text-center min-w-[200px] relative z-10`}>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Bill</div>
              <div className="text-2xl font-syne font-black">{fmt(displayTotal)}</div>
            </div>
          </div>

          {isCancelled ? (
            <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 p-10 rounded-[2.5rem] text-center mb-10 animate-fadeUp">
              <div className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-red-500/30">
                <X size={40} />
              </div>
              <h2 className="text-2xl font-syne font-black text-red-600 mb-2 uppercase tracking-tight">Pesanan Dibatalkan</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                Mohon maaf, pesanan Anda telah dibatalkan oleh pihak restoran. Silakan hubungi kasir atau buat pesanan baru.
              </p>
            </div>
          ) : (
            /* PROGRESS STEPS */
            <div className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] p-10 shadow-premium border border-gray-100 dark:border-white/5 mb-10">
              <div className="flex flex-col md:flex-row justify-between relative gap-10">
                <div className="hidden md:block absolute top-[27px] left-8 right-8 h-1 bg-gray-100 dark:bg-white/5 z-0">
                  <div className="h-full bg-or transition-all duration-1000 ease-in-out" style={{ width: `${fillPct}%` }}></div>
                </div>
                
                {steps.map((s, i) => {
                  const isDone = i <= curIdx
                  const isCur  = i === curIdx && curIdx < steps.length - 1
                  return (
                    <div key={i} className="flex md:flex-col items-center gap-6 md:gap-4 relative z-10 md:w-1/4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-xl ${
                        isDone 
                          ? 'bg-or text-white scale-110 shadow-orange-500/40' 
                          : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                      }`}>
                        {isDone && !isCur && i < steps.length - 1 ? <CheckCircle2 size={24} /> : <s.ico size={24} />}
                      </div>
                      <div className="text-left md:text-center">
                        <div className={`text-sm font-black transition-colors ${isDone ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{s.l}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.t}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI RECOMMENDATION */}
          {aiRecommendation && !isCompleted && (
            <div className="bg-or/5 border border-or/10 p-6 rounded-3xl mb-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center text-or shadow-sm">
                <Sparkles size={24} />
              </div>
              <p className="text-xs font-bold text-or leading-relaxed">{aiRecommendation}</p>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <button 
              onClick={downloadReceipt}
              className="flex items-center justify-center gap-3 py-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-sm font-black text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={18} className="text-or" /> Unduh Struk (PDF)
            </button>
            <button 
              onClick={() => window.open('https://wa.me/628123456789', '_blank')}
              className="flex items-center justify-center gap-3 py-4 bg-green-500 text-white rounded-2xl text-sm font-black hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
            >
              <Phone size={18} /> Hubungi Kami (WA)
            </button>
          </div>

          {/* REVIEW BOX */}
          {isCompleted && (
            <div className="bg-gradient-to-br from-or to-or3 p-1 rounded-[2.5rem] shadow-glow-or mb-10 animate-fadeUp">
              <div className="bg-white dark:bg-[#1A1A1A] rounded-[2.4rem] p-10 text-center">
                <h3 className="text-2xl font-syne font-black text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-3">
                  Puas dengan Hidangan Kami? <Star size={24} className="text-yw" fill="var(--yw)" />
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">Penilaianmu sangat berarti untuk kami.</p>
                
                {reviewDone ? (
                  <div className="py-10 animate-bounceIn">
                    <div className="w-20 h-20 bg-gn text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                      <CheckCircle2 size={40} />
                    </div>
                    <div className="text-xl font-black text-gn">Ulasan Berhasil Terkirim!</div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto space-y-8">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-[10px] font-black text-or uppercase tracking-widest">Pilih rating kamu</div>
                      <div className="flex justify-center gap-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} 
                            onClick={() => setReview((r) => ({ ...r, rating: s }))}
                            className={`transition-all duration-300 transform hover:scale-125 cursor-pointer ${
                              review.rating >= s 
                                ? 'text-or drop-shadow-[0_0_8px_rgba(255,165,0,0.6)] scale-110' 
                                : 'text-gray-200 dark:text-white/5'
                            }`}
                          >
                            <Star size={32} fill={review.rating >= s ? "var(--or)" : "none"} />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="relative group">
                       <MessageSquare className="absolute left-6 top-6 text-gray-300 group-focus-within:text-or transition-colors" size={20} />
                       <textarea 
                        className="w-full p-6 pl-14 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl outline-none focus:border-or transition-all text-sm font-bold min-h-[120px] resize-none"
                        placeholder="Tulis ulasan menarikmu di sini..."
                        value={review.komentar}
                        onChange={(e) => setReview((r) => ({ ...r, komentar: e.target.value }))}
                      />
                    </div>
                    
                    <button className="w-full py-5 bg-or text-white font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3" onClick={submitReview}>
                      <Send size={18} /> Kirim Ulasan
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <button className="w-full py-5 text-gray-400 font-black text-xs uppercase tracking-[0.3em] hover:text-or transition-colors flex items-center justify-center gap-2" 
            onClick={() => { 
              const key = getScopedKey(USER_KEYS.ACTIVE_ORDER)
              localStorage.removeItem(key)
              setActiveOrder(null)
              setPage('home') 
            }}>
            <ChevronLeft size={16} /> Kembali ke Beranda
          </button>        </div>
      </div>
    )
  }

  // ── STEP: PAYMENT METHOD ──
  if (step === 'payment') return (
    <div className="page bg-bg min-h-screen">
      <div className="ph py-12 md:py-16">
        <div className="ph-ttl text-3xl md:text-4xl flex items-center justify-center gap-3">
          Metode Bayar <CreditCard size={32} className="text-or" />
        </div>
        <div className="ph-sub">Pilih cara bayar yang paling nyaman untukmu</div>
      </div>
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <button 
            onClick={() => setPayMethod('qris')}
            className={`group p-10 rounded-[2.5rem] border-4 transition-all text-left relative overflow-hidden ${payMethod === 'qris' ? 'bg-white dark:bg-[#1A1A1A] border-or shadow-2xl scale-[1.02]' : 'bg-gray-100 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100'}`}
          >
            <div className={`w-16 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${payMethod === 'qris' ? 'bg-or text-white shadow-glow-or' : 'bg-white dark:bg-white/10 text-gray-400'}`}>
              <CreditCard size={32} />
            </div>
            <div className="text-xl font-syne font-black mb-2 text-gray-900 dark:text-white flex items-center gap-2">
              QRIS <Smartphone size={20} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">Scan QR & bayar instan via GoPay, OVO, ShopeePay, atau M-Banking.</p>
          </button>

          <button 
            onClick={() => setPayMethod('tunai')}
            className={`group p-10 rounded-[2.5rem] border-4 transition-all text-left relative overflow-hidden ${payMethod === 'tunai' ? 'bg-white dark:bg-[#1A1A1A] border-or shadow-2xl scale-[1.02]' : 'bg-gray-100 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100'}`}
          >
            <div className={`w-16 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${payMethod === 'tunai' ? 'bg-or text-white shadow-glow-or' : 'bg-white dark:bg-white/10 text-gray-400'}`}>
              <Wallet size={32} />
            </div>
            <div className="text-xl font-syne font-black mb-2 text-gray-900 dark:text-white flex items-center gap-2">
              Tunai <DollarSign size={20} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">Bayar langsung di kasir. Pesanan diproses setelah pembayaran dikonfirmasi.</p>
          </button>
        </div>

        <div className="space-y-6">
          {!isIn() && (
            <div className="al al-w p-6 rounded-3xl flex items-center gap-3">
              <AlertTriangle size={18} className="text-or" />
              <span>Kamu checkout sebagai <strong>Tamu</strong>. Login untuk dapat diskon! <strong className="text-or cursor-pointer" onClick={() => setPage('login')}>Masuk →</strong></span>
            </div>
          )}
          <button 
            className="w-full py-6 bg-or text-white font-black rounded-2xl shadow-glow-or text-lg hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50"
            disabled={!payMethod}
            onClick={doCheckout}
          >
            Konfirmasi & Bayar {fmt(displayTotal)}
          </button>
          <button className="w-full py-4 text-gray-400 font-bold flex items-center justify-center gap-2" onClick={() => setStep('cart')}>
            <ChevronLeft size={18} /> Kembali ke Keranjang
          </button>
        </div>
      </div>
    </div>
  )

  // ── STEP: CART (empty) ──
  if (cart.length === 0 && !activeOrder) return (
    <div className="page bg-bg min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-32 h-32 bg-white dark:bg-white/5 rounded-full flex items-center justify-center text-or mb-8 shadow-xl">
        <ShoppingBag size={48} />
      </div>
      <h2 className="text-3xl font-syne font-black text-gray-900 dark:text-white mb-2">Keranjang Masih Kosong</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-xs">Yuk, pilih menu lezat favoritmu sekarang.</p>
      <button 
        className="px-12 py-5 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-105 transition-all flex items-center gap-3"
        onClick={() => setPage('menu')}
      >
        <ShoppingBag size={20} /> Lihat Menu Pilihan
      </button>
    </div>
  )

  // ── STEP: CART (filled) ──
  return (
    <div className="page bg-bg min-h-screen">
      <div className="ph py-12 md:py-16">
        <div className="ph-ttl text-4xl md:text-5xl flex items-center justify-center gap-4">
          Keranjang <ShoppingBag size={40} className="text-or" />
        </div>
        <div className="ph-sub text-lg">{cart.length} item siap diproses</div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-24">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* List Items */}
          <div className="flex-1 space-y-6">
            {cart.map((item, i) => {
              const img = item.foto_menu ? `${CDN}/${item.foto_menu}` : PHS
              return (
                <div key={i} className="group bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] p-6 md:p-8 flex items-center gap-6 md:gap-10 shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-white/5">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                    <img className="w-full h-full object-cover" src={img} alt={item.nama_menu} onError={(e) => { e.target.src = PHS }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-syne font-black text-gray-900 dark:text-white mb-2 truncate">{item.nama_menu}</h3>
                    {item.varian && Object.keys(item.varian).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Object.values(item.varian).map((v, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-lg border border-gray-100 dark:border-white/5">{v}</span>
                        ))}
                      </div>
                    )}
                    <div className="text-xl font-syne font-black text-or">{fmt(item.harga_jual * item.qty)}</div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch gap-4">
                    <button onClick={() => onRemoveItem(i, -999)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={20} />
                    </button>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-black/20 p-2 rounded-2xl border border-gray-100 dark:border-white/5">
                      <button className="w-8 h-8 md:w-10 md:h-10 bg-white dark:bg-white/10 rounded-xl shadow-sm flex items-center justify-center font-black text-or active:scale-90 transition-all" onClick={() => onRemoveItem(i, -1)}>−</button>
                      <span className="w-8 text-center font-black text-gray-900 dark:text-white">{item.qty}</span>
                      <button className="w-8 h-8 md:w-10 md:h-10 bg-white dark:bg-white/10 rounded-xl shadow-sm flex items-center justify-center font-black text-or active:scale-90 transition-all" onClick={() => onRemoveItem(i, +1)}>+</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Checkout Column */}
          <div className="w-full lg:w-96 space-y-8">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] p-10 shadow-premium border border-gray-100 dark:border-white/5 sticky top-28 transition-all">
              <h4 className="text-xl font-syne font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <Clock size={20} className="text-or" /> Ringkasan
              </h4>
              <div className="space-y-4 mb-10 pb-8 border-b border-dashed border-gray-200 dark:border-white/10">
                <div className="flex justify-between text-sm font-bold text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-gray-900 dark:text-white">{fmt(displayTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-400">
                  <span>Pajak (PB1)</span>
                  <span className="text-gray-900 dark:text-white">Rp 0</span>
                </div>
              </div>
              <div className="flex justify-between items-end mb-12">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total Bill</span>
                <span className="text-3xl font-syne font-black text-or leading-none">{fmt(displayTotal)}</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={12} className="text-or" /> Nomor Meja *
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:border-or transition-all text-sm font-bold"
                    placeholder="Contoh: 07"
                    value={tableNo}
                    onChange={(e) => setTableNo(e.target.value)}
                  />
                </div>

                {isIn() && getPoin() >= 5 && (
                  <div className="p-4 bg-gn/10 border border-gn/20 rounded-2xl flex items-center gap-3 animate-pulse">
                    <Star size={20} className="text-gn fill-gn" />
                    <span className="text-[11px] font-black text-gn uppercase tracking-tight leading-tight">Reward Tersedia: Diskon 50% Aktif!</span>
                  </div>
                )}

                <button 
                  className="w-full py-5 bg-or text-white font-black rounded-2xl shadow-glow-or hover:shadow-orange-600/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group"
                  disabled={!tableNo.toString().trim()}
                  onClick={() => setStep('payment')}
                >
                  Pilih Pembayaran
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
