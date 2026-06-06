import { useState, useEffect, useMemo } from 'react'
import { Calendar, Users, Clock, Phone, User, Send, CheckCircle, X, LayoutDashboard, Coffee, Utensils, Plus, Minus, Trash2, Search, Check, ArrowRight, MessageSquare, Info, AlertCircle, RefreshCw } from 'lucide-react'
import { API, CDN, authH, getUID, KEYS, USER_KEYS, getScopedKey } from '../utils/auth'
import socket from '../utils/socket'

export default function ReservationPage({ showToast }) {
  const uid = getUID()
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [localRes, setLocalRes] = useState([])
  const [tables, setTables] = useState([])
  const [availableMenus, setAvailableMenus] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedMenus, setSelectedMenus] = useState([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [activeStep, setActiveStep] = useState(1) // 1: Info, 2: Table, 3: Menu, 4: Payment
  const [error, setError] = useState(null)
  const [newlyCreatedRes, setNewlyCreatedRes] = useState(null)

  const [form, setForm] = useState({
    nama_tamu: '',
    nomor_wa: '',
    jumlah_orang: 2,
    waktu_reservasi: '',
    durasi_menit: 120,
    catatan: ''
  })

  const fetchUserReservations = async () => {
    try {
      // Senior Engineer Note: Standard 'cache: no-store' for CORS compatibility
      const res = await fetch(`${API}/reservations`, { 
        headers: authH(),
        cache: 'no-store'
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        const myUid = getUID()
        const filtered = data.data.filter(r => String(r.id_user || r.userId) === String(myUid))
        
        // BUG FIX 1: Replace state entirely instead of appending/merging manually
        // This ensures no duplication occurs when the API returns the full list
        setLocalRes(filtered)
        
        // Update local cache silently
        const localKey = getScopedKey(USER_KEYS.RESERVATIONS)
        localStorage.setItem(localKey, JSON.stringify(filtered))
      }
    } catch (err) {
      console.error('[Reservation] fetchUserReservations failed', err)
    }
  }

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(getScopedKey(USER_KEYS.RESERVATIONS)) || '[]')
    setLocalRes(saved)
    fetchMenus()
    fetchUserReservations()

    // Real-time Event Listeners (Event-Driven)
    socket.on('table_status_changed', () => {
        console.log('[Reservation] Realtime: Table Status Change Detected')
        fetchAvailability()
    })
    socket.on('reservations_updated', () => {
        console.log('[Reservation] Realtime: Global Reservations Updated')
        fetchAvailability()
        fetchUserReservations()
    })
    socket.on('update_reservation', () => {
        console.log('[Reservation] Realtime: Reservation Status Updated')
        fetchUserReservations()
    })

    return () => {
        socket.off('table_status_changed')
        socket.off('reservations_updated')
        socket.off('update_reservation')
    }
  }, [uid])

  useEffect(() => {
    if (form.waktu_reservasi) {
      fetchAvailability()
    }
  }, [form.waktu_reservasi, form.durasi_menit])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleStep1Submit = (e) => {
    e.preventDefault()
    if (!form.nama_tamu.trim() || !form.nomor_wa.trim() || !form.waktu_reservasi) {
      showToast('Mohon lengkapi informasi dasar & waktu', 'error')
      return
    }
    setActiveStep(2)
    setTimeout(() => scrollToSection('step-meja'), 100)
    fetchAvailability()
  }

  const handleStep2Submit = () => {
    if (!selectedTable) {
      showToast('Pilih meja terlebih dahulu', 'error')
      return
    }
    setActiveStep(3)
    setTimeout(() => scrollToSection('step-menu'), 100)
  }

  const handleSkipMenu = () => {
    if (!selectedTable) {
      showToast('Pilih meja terlebih dahulu', 'error')
      return
    }
    setActiveStep(3)
    setTimeout(() => {
        const element = document.getElementById('final-submit')
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const fetchMenus = async () => {
    try {
      const res = await fetch(`${API}/menu`, { 
        headers: authH(),
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Gagal mengambil data menu')
      const data = await res.json()
      if (data.success) {
        setAvailableMenus(data.data)
        setError(null)
      } else {
        throw new Error(data.message || 'Gagal mengambil data menu')
      }
    } catch (err) {
      console.error('Fetch Menus Error:', err)
      setError('Koneksi ke server terputus. Pastikan server backend berjalan.')
    }
  }

  const fetchAvailability = async () => {
    if (!form.waktu_reservasi) return;
    setLoadingTables(true)
    setError(null)
    const timerLabel = `[Reservation] fetchAvailability-${Date.now()}`
    console.time(timerLabel)
    try {
      const dt = new Date(form.waktu_reservasi)
      const date = dt.toISOString().split('T')[0]
      const time = dt.toTimeString().split(' ')[0].substring(0, 5)
      
      const res = await fetch(`${API}/reservations/availability?date=${date}&time=${time}&duration=${form.durasi_menit}`, {
        headers: authH(),
        cache: 'no-store'
      })
      
      if (!res.ok) throw new Error('Gagal mengecek ketersediaan meja')
      
      const data = await res.json()
      if (data.success) {
        setTables(data.data)
        if (selectedTable) {
          const current = data.data.find(t => t.id === selectedTable.id);
          if (!current || !current.available) {
              setSelectedTable(null);
          }
        }
      } else {
        throw new Error(data.message || 'Gagal mengecek ketersediaan meja')
      }
    } catch (err) {
      console.error('Fetch Availability Error:', err)
      showToast(err.message, 'error')
      setTables([])
    } finally {
      setLoadingTables(false)
      console.timeEnd(timerLabel)
    }
  }

  const filteredMenus = useMemo(() => {
    return availableMenus.filter(m => 
      m.nama_menu.toLowerCase().includes(menuSearch.toLowerCase()) ||
      m.kategori.toLowerCase().includes(menuSearch.toLowerCase())
    )
  }, [availableMenus, menuSearch])

  const updateMenuQty = (menu, delta) => {
    setSelectedMenus(prev => {
      const existing = prev.find(m => m.id_menu === menu.id)
      if (existing) {
        const newQty = existing.jumlah + delta
        if (newQty <= 0) return prev.filter(m => m.id_menu !== menu.id)
        return prev.map(m => m.id_menu === menu.id ? { ...m, jumlah: newQty } : m)
      } else if (delta > 0) {
        return [...prev, { id_menu: menu.id, nama_menu: menu.nama_menu, jumlah: 1, harga: menu.harga_jual }]
      }
      return prev
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nama_tamu.trim() || !form.nomor_wa.trim() || !form.waktu_reservasi || !selectedTable) {
      showToast('Mohon lengkapi data dan pilih meja', 'error')
      return
    }

    const selectedDate = new Date(form.waktu_reservasi)
    if (selectedDate < new Date()) {
      showToast('Waktu reservasi tidak boleh di masa lalu', 'error')
      return
    }

    setLoading(true)
    console.time('[Reservation] CreateReservation')
    try {
      const formattedDate = form.waktu_reservasi.replace('T', ' ') + ':00'
      
      const res = await fetch(`${API}/reservations`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ 
          ...form, 
          waktu_reservasi: formattedDate,
          id_user: getUID(),
          id_meja: selectedTable.id,
          menus: selectedMenus
        }),
      })
      
      const data = await res.json()
      
      if (data.success) {
        showToast('Reservasi berhasil dibuat!', 'success')
        
        const newRes = { 
          ...form, 
          id: data.reservationId, 
          id_user: getUID(),
          nomor_meja: selectedTable.nomor_meja,
          status: 'pending',
          total_bayar: totalMenuPrice,
          created_at: new Date().toISOString() 
        }
        
        setNewlyCreatedRes(newRes)
        setActiveStep(4)
        
        // Optimistic Sync to local state
        setLocalRes(prev => [newRes, ...prev])

        setForm({ nama_tamu: '', nomor_wa: '', jumlah_orang: 2, waktu_reservasi: '', durasi_menit: 120, catatan: '' })
        setSelectedTable(null)
        setSelectedMenus([])
        
        // Broadcast to Admin/Kasir
        socket.emit('new_reservation', newRes)
      } else {
        throw new Error(data.message || 'Gagal buat reservasi')
      }
    } catch (err) {
      console.error('[Reservation] CreateReservation failed', err)
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
      console.timeEnd('[Reservation] CreateReservation')
    }
  }

  // Filter & Prioritas Meja
  const sortedTables = useMemo(() => {
    if (!tables.length) return [];
    
    // Sort tables by area and then by number
    return [...tables].sort((a, b) => {
        if (a.area !== b.area) return a.area === 'VIP' ? 1 : -1;
        return a.nomor_meja.localeCompare(b.nomor_meja);
    });
  }, [tables]);

  const recommendedTables = useMemo(() => {
    return sortedTables.filter(t => t.kapasitas >= form.jumlah_orang && t.kapasitas <= form.jumlah_orang + 2);
  }, [sortedTables, form.jumlah_orang]);

  const totalMenuPrice = selectedMenus.reduce((acc, m) => acc + (m.harga * m.jumlah), 0)

  const StatusIndicator = ({ status, label }) => (
    <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
            status === 'kosong' ? 'bg-green-500' :
            status === 'penuh' ? 'bg-red-500' :
            status === 'akan dipakai' ? 'bg-yellow-500' : 'bg-gray-800'
        }`}></div>
        <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
    </div>
  )

  if (error) {
    return (
      <div className="page bg-bg min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-8 animate-bounceIn">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-3xl font-syne font-black text-gray-900 dark:text-white mb-2">Ups, Ada Masalah!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md leading-relaxed">
          {error}
        </p>
        <button 
          className="px-10 py-4 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-105 transition-all flex items-center gap-3"
          onClick={() => { setError(null); fetchMenus(); }}
        >
          <RefreshCw size={20} /> Coba Muat Ulang
        </button>
      </div>
    )
  }

  return (
    <div className="page bg-bg min-h-screen pb-32">
      <div className="bg-white dark:bg-[#1A1A1A] px-6 py-12 md:px-12 md:py-16 transition-colors duration-300 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-or font-black uppercase tracking-[0.3em] text-[10px] mb-2">Exclusive Reservation</div>
          <h1 className="text-4xl md:text-5xl font-syne font-black text-gray-900 dark:text-white mb-4 tracking-tighter flex items-center justify-center gap-3">
            Sistem Reservasi Cerdas <Utensils size={32} className="text-or" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-xl mx-auto font-medium">
            Booking meja impian Anda secara realtime dengan fitur visual layout dan pre-order menu.
          </p>
        </div>
      </div>

      <div className="px-4 py-8 md:px-6 md:py-12 max-w-6xl mx-auto">
        {/* STEP INDICATOR */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 dark:bg-white/5 -translate-y-1/2 z-0 rounded-full"></div>
          <div className={`absolute top-1/2 left-0 h-1 bg-or -translate-y-1/2 z-0 transition-all duration-700 rounded-full shadow-glow-or`} style={{ width: `${(activeStep - 1) * 33.33}%` }}></div>
          
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="relative z-10 flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
                activeStep === s ? 'bg-or text-white shadow-glow-or scale-125' : 
                activeStep > s ? 'bg-green-500 text-white' : 'bg-white dark:bg-[#1A1A1A] text-gray-400 border-2 border-gray-100 dark:border-white/5'
              }`}>
                {activeStep > s ? <Check size={20} strokeWidth={3} /> : s}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeStep >= s ? 'text-or' : 'text-gray-400'}`}>
                {s === 1 ? 'Data Diri' : s === 2 ? 'Pilih Meja' : s === 3 ? 'Pre-Order' : 'Pembayaran'}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 animate-fadeUp">
          {/* STEP 1: BASIC INFO */}
          <div id="step-info" className={`bg-white dark:bg-[#1A1A1A] p-8 md:p-12 rounded-[3rem] shadow-premium border border-gray-100 dark:border-white/5 transition-all duration-300 ${activeStep === 4 ? 'hidden' : activeStep > 1 ? 'opacity-60 blur-[1px]' : ''}`}>
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-or rounded-full"></div>
                <h2 className="text-xl md:text-2xl font-syne font-black text-gray-900 dark:text-white uppercase tracking-tight">1. Detail Kedatangan</h2>
              </div>
              {activeStep > 1 && (
                <button type="button" onClick={() => setActiveStep(1)} className="px-4 py-2 bg-or/10 text-or text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-or hover:text-white transition-all">Ubah Info</button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-or" /> Nama Lengkap
                </label>
                <input 
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-or/30 rounded-2xl outline-none transition-all text-sm font-bold dark:text-white"
                  value={form.nama_tamu}
                  onChange={(e) => setForm({ ...form, nama_tamu: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Phone size={14} className="text-or" /> Nomor WhatsApp
                </label>
                <input 
                  type="tel"
                  placeholder="081234567890"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-or/30 rounded-2xl outline-none transition-all text-sm font-bold dark:text-white"
                  value={form.nomor_wa}
                  onChange={(e) => setForm({ ...form, nomor_wa: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} className="text-or" /> Jumlah Tamu
                </label>
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-2 rounded-2xl border-2 border-transparent">
                  <button 
                    type="button"
                    onClick={() => setForm({ ...form, jumlah_orang: Math.max(1, form.jumlah_orang - 1) })}
                    className="w-12 h-12 bg-white dark:bg-black/20 rounded-xl shadow-sm flex items-center justify-center font-black text-or active:scale-90 transition-all"
                  ><Minus size={16}/></button>
                  <span className="flex-1 text-center font-black text-gray-800 dark:text-white text-lg">{form.jumlah_orang}</span>
                  <button 
                    type="button"
                    onClick={() => setForm({ ...form, jumlah_orang: form.jumlah_orang + 1 })}
                    className="w-12 h-12 bg-white dark:bg-black/20 rounded-xl shadow-sm flex items-center justify-center font-black text-or active:scale-90 transition-all"
                  ><Plus size={16}/></button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-or" /> Tanggal & Jam
                </label>
                <input 
                  type="datetime-local"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-or/30 rounded-2xl outline-none transition-all text-sm font-bold dark:text-white"
                  value={form.waktu_reservasi}
                  onChange={(e) => setForm({ ...form, waktu_reservasi: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} className="text-or" /> Durasi (Menit)
                </label>
                <select 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-or/30 rounded-2xl outline-none transition-all text-sm font-bold dark:text-white appearance-none"
                  value={form.durasi_menit}
                  onChange={(e) => setForm({ ...form, durasi_menit: parseInt(e.target.value) })}
                >
                  <option value={60}>1 Jam</option>
                  <option value={120}>2 Jam (Standard)</option>
                  <option value={180}>3 Jam</option>
                  <option value={240}>4 Jam</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={14} className="text-or" /> Catatan Tambahan
                </label>
                <input 
                  type="text"
                  placeholder="Alergi, request khusus, dll"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-or/30 rounded-2xl outline-none transition-all text-sm font-bold dark:text-white"
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                />
              </div>
            </div>

            {activeStep === 1 && (
              <div className="mt-12 pt-8 border-t border-gray-50 dark:border-white/5">
                <button 
                  type="button"
                  onClick={handleStep1Submit}
                  className="w-full md:w-auto px-12 py-5 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-4 group"
                >
                  Cek Ketersediaan Meja <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: VISUAL TABLE LAYOUT */}
          <div id="step-meja" className={`bg-white dark:bg-[#1A1A1A] p-8 md:p-12 rounded-[3.5rem] shadow-premium border border-gray-100 dark:border-white/5 space-y-10 transition-all duration-500 ${activeStep === 4 ? 'hidden' : activeStep < 2 ? 'opacity-40 blur-md pointer-events-none' : activeStep > 2 ? 'opacity-60 blur-[1px]' : 'opacity-100'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-or rounded-full"></div>
                <div>
                  <h2 className="text-xl md:text-2xl font-syne font-black text-gray-900 dark:text-white uppercase tracking-tight">2. Visual Layout Meja</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Silakan pilih meja yang berwarna hijau</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                <StatusIndicator status="kosong" label="Kosong" />
                <StatusIndicator status="penuh" label="Penuh" />
                <StatusIndicator status="akan dipakai" label="Booking" />
                <StatusIndicator status="maintenance" label="Maint." />
              </div>
            </div>

            {loadingTables ? (
              <div className="py-32 flex flex-col items-center justify-center gap-6 text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">
                <div className="w-16 h-16 border-4 border-or border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Sinkronisasi Database...</span>
              </div>
            ) : sortedTables.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                  <div className="text-gray-400 font-bold uppercase tracking-widest">Meja tidak ditemukan atau gagal dimuat</div>
                  <button 
                    type="button" 
                    onClick={fetchAvailability}
                    className="px-6 py-2 bg-or/10 text-or text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-or hover:text-white transition-all"
                  >
                      Coba Muat Ulang
                  </button>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Recommendation Filter Alert */}
                <div className="bg-or/5 border border-or/20 p-6 rounded-3xl flex items-start gap-4">
                    <div className="p-3 bg-or text-white rounded-xl shadow-lg"><Info size={20} /></div>
                    <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Rekomendasi Pintar MejaKita</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                            Berdasarkan <b>{form.jumlah_orang} tamu</b>, kami telah menandai meja yang paling sesuai untuk kenyamanan Anda.
                        </p>
                    </div>
                </div>

                {/* Table Grid Areas */}
                {['Main', 'VIP'].map(area => {
                    const areaTables = sortedTables.filter(t => t.area === area);
                    if (!areaTables.length) return null;

                    return (
                        <div key={area} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">{area} Area</span>
                                <div className="flex-1 h-px bg-gray-100 dark:bg-white/5"></div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3 md:gap-4">
                                {areaTables.map((t) => {
                                    const isRecommended = recommendedTables.find(rt => rt.id === t.id);
                                    const isSelected = selectedTable?.id === t.id;
                                    
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            disabled={!t.available}
                                            onClick={() => {
                                                console.log('Table clicked:', t);
                                                setSelectedTable(t);
                                            }}
                                            className={`group relative aspect-square rounded-2xl md:rounded-3xl border-2 transition-all duration-500 flex flex-col items-center justify-center gap-1 ${
                                                isSelected 
                                                    ? 'border-or bg-or/20 shadow-[0_0_30px_rgba(255,122,0,0.4)] scale-110 z-20 ring-4 ring-or/20' 
                                                    : t.visualStatus === 'kosong'
                                                        ? isRecommended 
                                                            ? 'border-green-500/30 bg-green-500/5 hover:border-green-500 hover:bg-green-500/20' 
                                                            : 'border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 hover:border-or/30'
                                                        : 'border-transparent bg-gray-100 dark:bg-white/10 opacity-40 cursor-not-allowed'
                                            }`}
                                        >
                                            {/* Status Dot */}
                                            <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                                                t.visualStatus === 'kosong' ? 'bg-green-500' :
                                                t.visualStatus === 'penuh' ? 'bg-red-500' :
                                                t.visualStatus === 'akan dipakai' ? 'bg-yellow-500' : 'bg-gray-800'
                                            }`}></div>

                                            <div className={`text-base md:text-lg font-black transition-colors ${isSelected ? 'text-or' : 'text-gray-900 dark:text-white'}`}>
                                                {t.nomor_meja}
                                            </div>
                                            <div className={`text-[8px] font-bold uppercase transition-colors ${isSelected ? 'text-or' : 'text-gray-400'}`}>
                                                {t.kapasitas} Pax
                                            </div>

                                            {isRecommended && t.available && !isSelected && (
                                                <div className="absolute -bottom-1 px-2 py-0.5 bg-green-500 text-white text-[7px] font-black uppercase rounded-full">Best</div>
                                            )}

                                            {isSelected && (
                                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-or text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-[#1A1A1A] animate-bounceIn">
                                                    <Check size={16} strokeWidth={4} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
              </div>
            )}

            {activeStep === 2 && (
              <div className="mt-12 pt-8 border-t border-gray-50 dark:border-white/5 flex flex-col md:flex-row gap-6">
                <button 
                  type="button"
                  onClick={handleStep2Submit}
                  disabled={!selectedTable}
                  className="px-12 py-5 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-4 disabled:opacity-50 group"
                >
                  Lanjut Pre-Order Menu <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </button>
                <button 
                   type="button"
                   onClick={handleSkipMenu}
                   disabled={!selectedTable}
                   className="px-10 py-5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  Lewati & Booking Langsung
                </button>
              </div>
            )}
          </div>

          {/* STEP 3: PRE-ORDER MENU */}
          <div id="step-menu" className={`bg-white dark:bg-[#1A1A1A] p-8 md:p-12 rounded-[3.5rem] shadow-premium border border-gray-100 dark:border-white/5 space-y-10 transition-all duration-500 ${activeStep === 4 ? 'hidden' : activeStep < 3 ? 'opacity-40 blur-md pointer-events-none' : 'opacity-100'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-or rounded-full"></div>
                <div>
                  <h2 className="text-xl md:text-2xl font-syne font-black text-gray-900 dark:text-white uppercase tracking-tight">3. Pre-Order Menu <span className="text-gray-400 text-xs normal-case font-bold ml-2">(Opsional)</span></h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sajian siap saat Anda tiba di restoran</p>
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Cari menu favorit..."
                  className="pl-14 pr-6 py-3 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-or/30 rounded-full text-sm font-bold outline-none w-full md:w-80 transition-all"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Menu List */}
              <div className="lg:col-span-2 space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {filteredMenus.length === 0 ? (
                  <div className="py-32 text-center text-gray-400 text-sm font-black uppercase tracking-widest italic opacity-30">Menu tidak tersedia</div>
                ) : (
                  filteredMenus.map((m) => {
                    const selected = selectedMenus.find(sm => sm.id_menu === m.id)
                    return (
                      <div 
                        key={m.id} 
                        className={`group p-5 rounded-3xl border-2 transition-all flex items-center gap-6 ${
                          selected ? 'border-or bg-or/5 shadow-lg' : 'border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:border-or/20'
                        }`}
                      >
                        <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 shadow-premium">
                          {m.foto_menu && <img src={`${CDN}/${m.foto_menu}`} alt={m.nama_menu} className="w-full h-full object-cover transition-transform group-hover:scale-110" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-black text-gray-900 dark:text-white truncate">{m.nama_menu}</div>
                          <div className="text-xs font-bold text-or mt-1">Rp {m.harga_jual.toLocaleString()}</div>
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2 px-2 py-0.5 bg-gray-100 dark:bg-white/10 w-fit rounded-md">{m.kategori}</div>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white dark:bg-black/20 rounded-2xl p-2 border border-gray-100 dark:border-white/5 shadow-premium">
                          <button 
                            type="button" 
                            onClick={() => updateMenuQty(m, -1)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${selected ? 'bg-or/10 text-or hover:bg-or hover:text-white' : 'text-gray-300 pointer-events-none'}`}
                          >
                            <Minus size={16} />
                          </button>
                          <span className={`text-sm font-black min-w-[32px] text-center ${selected ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>
                            {selected ? selected.jumlah : 0}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => updateMenuQty(m, 1)}
                            className="w-10 h-10 flex items-center justify-center bg-or/10 text-or hover:bg-or hover:text-white rounded-xl transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-black/20 rounded-[3rem] p-8 border-2 border-gray-50 dark:border-white/5 flex flex-col h-full sticky top-4 shadow-xl">
                  <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <Utensils size={14} className="text-or" /> Ringkasan Pre-Order
                  </div>
                  
                  <div className="flex-1 space-y-5 mb-10 overflow-y-auto max-h-[400px] no-scrollbar">
                    {selectedMenus.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-16">
                        <Coffee size={56} className="mb-4" />
                        <div className="text-xs font-black uppercase tracking-widest">Pilih Menu Di Samping</div>
                      </div>
                    ) : (
                      selectedMenus.map((m) => (
                        <div key={m.id_menu} className="flex items-center justify-between gap-4 animate-fadeIn group">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{m.nama_menu}</div>
                            <div className="text-[11px] text-gray-400 font-bold uppercase mt-1">
                              {m.jumlah}x • Rp {(m.harga * m.jumlah).toLocaleString()}
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => updateMenuQty({id: m.id_menu}, -m.jumlah)}
                            className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-8 border-t-2 border-dashed border-gray-100 dark:border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-gray-400 uppercase">Selected Table</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white bg-or/10 px-3 py-1 rounded-lg">
                        {selectedTable ? `Meja ${selectedTable.nomor_meja}` : 'Not Selected'}
                      </span>
                    </div>
                    {selectedTable && (
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black text-gray-400 uppercase">Kapasitas / Area</span>
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">
                                {selectedTable.kapasitas} Pax • {selectedTable.area} Area
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total Bill</span>
                      <span className="text-2xl font-syne font-black text-or">Rp {totalMenuPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: QRIS PAYMENT */}
          <div id="step-pembayaran" className={`bg-white dark:bg-[#1A1A1A] p-8 md:p-12 rounded-[3.5rem] shadow-premium border border-gray-100 dark:border-white/5 space-y-10 transition-all duration-500 ${activeStep < 4 ? 'hidden' : 'opacity-100'}`}>
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
              <div className="w-20 h-2 bg-or rounded-full mb-8"></div>
              <h2 className="text-3xl md:text-4xl font-syne font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">4. Selesaikan Pembayaran</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-12">
                Silakan scan QRIS di bawah ini untuk mengonfirmasi reservasi Anda.
              </p>

              <div className="bg-white dark:bg-black/20 p-10 rounded-[3rem] border-2 border-or shadow-2xl mb-12 relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-2 bg-or"></div>
                 <div className="w-56 h-56 bg-gray-50 dark:bg-white/5 rounded-3xl mx-auto mb-8 flex items-center justify-center text-8xl text-or/20 border-4 border-dashed border-or/30 animate-pulse">
                    ⊞
                 </div>
                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Total Biaya Pre-Order</div>
                 <div className="text-4xl font-syne font-black text-or">Rp {newlyCreatedRes?.total_bayar.toLocaleString() || '0'}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 text-left">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID Reservasi</div>
                      <div className="text-lg font-black text-gray-800 dark:text-white">#{newlyCreatedRes?.id}</div>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 text-left">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Meja Dipilih</div>
                      <div className="text-lg font-black text-gray-800 dark:text-white">Meja {newlyCreatedRes?.nomor_meja}</div>
                  </div>
              </div>

              <button 
                type="button"
                onClick={() => {
                   const updated = [newlyCreatedRes, ...localRes]
                   setLocalRes(updated)
                   localStorage.setItem(getScopedKey(USER_KEYS.RESERVATIONS), JSON.stringify(updated))
                   
                   // Realtime Trigger
                   socket.emit('new_reservation', newlyCreatedRes)
                   console.log('Reservation Created & Payment Confirmed:', newlyCreatedRes)
                   console.log('Bookings Count:', updated.length)

                   setShowSuccess(true)
                   setActiveStep(1)
                   setNewlyCreatedRes(null)
                }}
                className="w-full py-6 bg-or text-white font-black rounded-[2rem] shadow-glow-or hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-4"
              >
                Konfirmasi Sudah Bayar <CheckCircle size={20} />
              </button>
              
              <p className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={14} className="text-or" /> Pembayaran akan diverifikasi otomatis oleh sistem
              </p>
            </div>
          </div>

          {/* FINAL SUBMIT BUTTON */}
          <div id="final-submit" className={`pt-10 ${activeStep === 4 ? 'hidden' : ''}`}>
            {activeStep < 3 ? (
              <div className="p-10 bg-gray-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-white/10 text-center">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Selesaikan langkah sebelumnya untuk konfirmasi reservasi</p>
              </div>
            ) : (
              <button 
                type="submit"
                disabled={loading || !selectedTable}
                className="w-full py-8 bg-or text-white font-black rounded-[2.5rem] shadow-glow-or hover:shadow-orange-600/50 hover:-translate-y-2 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                {loading ? (
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-lg">Memproses Reservasi...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-xl relative z-10">
                    <Send size={24} className="group-hover:rotate-12 transition-transform" />
                    Konfirmasi Reservasi Sekarang
                  </div>
                )}
              </button>
            )}
            <div className="mt-6 flex items-center justify-center gap-6 opacity-40">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <CheckCircle size={12} className="text-green-500" /> Realtime Check
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <CheckCircle size={12} className="text-green-500" /> Secure Payment
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <CheckCircle size={12} className="text-green-500" /> 24/7 Support
                </div>
            </div>
          </div>
        </form>

        {/* YOUR BOOKINGS */}
        {localRes.length > 0 && (
          <div className="mt-32 animate-fadeUp">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-2 h-8 bg-or rounded-full"></div>
              <h2 className="text-3xl font-syne font-black text-gray-900 dark:text-white uppercase tracking-tight">Riwayat Reservasi Saya</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localRes.map((r, i) => (
                <div key={i} className="bg-white dark:bg-[#1A1A1A] p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 flex flex-col gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 bg-or/10 rounded-2xl flex items-center justify-center text-or shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                      <Calendar size={32} />
                    </div>
                    <div className="text-right">
                       <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         ['confirmed', 'seated', 'completed'].includes(r.status) ? 'bg-green-500/10 text-green-600' :
                         ['canceled', 'cancelled', 'expired'].includes(r.status) ? 'bg-red-500/10 text-red-600' :
                         'bg-yellow-500/10 text-yellow-600'
                       }`}>
                         {r.status || 'pending'}
                       </span>
                       <div className="text-[9px] font-bold text-gray-400 mt-2">#{r.id}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-black text-gray-900 dark:text-white line-clamp-1">{r.nama_tamu}</div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                      <Clock size={12} className="text-or" />
                      {new Date(r.waktu_reservasi).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })} • {new Date(r.waktu_reservasi).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-6 border-t border-gray-50 dark:border-white/5">
                     <span className="flex-1 text-center text-[10px] font-black bg-gray-50 dark:bg-white/5 py-3 rounded-xl text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/10 uppercase tracking-widest">Meja {r.nomor_meja || '--'}</span>
                     <span className="flex-1 text-center text-[10px] font-black bg-gray-50 dark:bg-white/5 py-3 rounded-xl text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/10 uppercase tracking-widest">{r.jumlah_orang} Tamu</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative animate-bounceIn text-center border border-white/10">
            <button onClick={() => setShowSuccess(false)} className="absolute top-10 right-10 text-gray-400 hover:text-or transition-colors"><X size={28} /></button>
            
            <div className="w-28 h-28 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-green-500/40 border-8 border-white dark:border-[#1A1A1A] animate-pulse">
              <CheckCircle size={60} strokeWidth={3} />
            </div>
            
            <h2 className="text-4xl font-syne font-black text-gray-900 dark:text-white mb-6 tracking-tighter uppercase">Reservasi Berhasil!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-base mb-12 leading-relaxed font-medium px-4">
                Meja impian Anda telah diamankan. Admin MejaKita akan segera menghubungi Anda via <b>WhatsApp</b> untuk konfirmasi akhir.
            </p>
            
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full py-6 bg-or text-white font-black rounded-[2rem] shadow-glow-or hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Terima Kasih, MejaKita!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
