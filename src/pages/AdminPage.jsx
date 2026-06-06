import { useState, useEffect, useRef, useCallback } from 'react'
import Loader from '../components/Loader'
import socket from '../utils/socket'
import { API, CDN, PHS, fmt, fmtDate, authH, getToken, getRole, COMPLETED_STATUS, KEYS, USER_KEYS, getScopedKey } from '../utils/auth'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts'
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'
import { 
  TrendingUp, Users, DollarSign, Package, Calendar, Star, 
  FileText, Download, Filter, RefreshCw, LayoutDashboard, Utensils, Trash2, MessageSquare, X, CheckCircle, CupSoda, AlertTriangle
} from 'lucide-react'

export default function AdminPage({ setPage, showToast, activeOrder, setActiveOrder }) {
  const [tab,           setTab]           = useState('dashboard')
  const [stats,         setStats]         = useState(null)
  const [orders,        setOrders]        = useState([])
  const [reservations,  setReservations]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_reservations_cache') || '[]') } catch(e) { return [] }
  })
  const [reviews,       setReviews]       = useState([])
  const [menus,         setMenus]         = useState([])
  const [loading,       setLoading]       = useState(false)
  const [dateFilter,    setDateFilter]    = useState({ start: '', end: '' })
  
  // MENU CRUD & MODAL STATES
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [editingMenu,   setEditingMenu]   = useState(null)
  const [menuForm,      setMenuForm]      = useState({ nama_menu: '', kategori: 'makanan', harga_modal: '', harga_jual: '', is_available: 1 })
  const [menuFile,      setMenuFile]      = useState(null)

  // CUSTOM CONFIRMATION MODAL
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', desc: '', onConfirm: null, type: 'info' })

  const role = getRole()

  const setPresetFilter = (type) => {
    const now = new Date()
    let start, end = now.toISOString().split('T')[0]
    
    if (type === 'today') {
      start = end
    } else if (type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    } else if (type === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    } else {
      start = ''; end = ''
    }
    setDateFilter({ start, end })
  }

  const tabs = [
    { id: 'dashboard', l: 'Analytics', ico: LayoutDashboard, roles: ['admin', 'kasir', 'dapur'] },
    { id: 'orders', l: 'Live Orders', ico: Package, roles: ['admin', 'dapur', 'kasir'] },
    { id: 'menus_admin', l: 'Manage Menu', ico: Utensils, roles: ['admin', 'dapur', 'kasir'] },
    { id: 'reservations', l: 'Bookings', ico: Calendar, roles: ['admin', 'kasir', 'dapur'] },
    { id: 'reviews_admin', l: 'Reviews', ico: MessageSquare, roles: ['admin'] },
    { id: 'reports', l: 'Reports', ico: TrendingUp, roles: ['admin', 'kasir', 'dapur'] }
  ].filter(t => t.roles.includes(role))

  useEffect(() => {
    if (role === 'dapur') setTab('orders')
  }, [role])

  // Dashboard Fetcher
  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    console.time('[Admin] fetchDashboard')
    try {
      const q = dateFilter.start && dateFilter.end ? `?start_date=${dateFilter.start}&end_date=${dateFilter.end}` : ''
      const r = await fetch(`${API}/dashboard${q}`, { 
        headers: authH(),
        cache: 'no-store'
      })
      const d = await r.json()
      if (d.success) setStats(d.data)
    } catch (e) {
      showToast('Gagal memuat statistik', 'error')
    } finally {
      setLoading(false)
      console.timeEnd('[Admin] fetchDashboard')
    }
  }, [dateFilter, showToast])

  const fetchOrders = useCallback(async () => {
    let fetchedOrders = []
    try {
      // Senior Engineer Note: Standard 'cache: no-store' instead of manual header to avoid CORS preflight issues.
      const r = await fetch(`${API}/orders`, { 
        headers: authH(),
        cache: 'no-store'
      })
      const d = await r.json()
      if (d.success) fetchedOrders = d.data
    } catch (e) {
      console.error('[Admin] API fetchOrders failed', e)
    }

    // Merge with Local (Simulation support)
    try {
      let masterOrders = []
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mejakita_orders_')) {
          const items = JSON.parse(localStorage.getItem(key) || '[]')
          masterOrders = [...masterOrders, ...items]
        }
      })

      masterOrders.forEach(mo => {
        const orderId = mo.id_order || mo.id
        const existsIdx = fetchedOrders.findIndex(o => String(o.id) === String(orderId))
        
        const mapped = {
          id: orderId,
          userId: mo.userId || mo.id_user,
          id_user: mo.userId || mo.id_user,
          nomor_meja: mo.nomor_meja,
          status: mo.status,
          total_pembayaran: mo.total_pembayaran || mo.total_akhir,
          pelanggan: mo.pelanggan || mo.nama_user || 'Guest (Local)',
          waktu_pesan: mo.waktu_pesan || mo.updatedAt || new Date().toISOString()
        }

        if (existsIdx < 0) {
          fetchedOrders.unshift(mapped)
        } else {
          const localStatus = (mo.status || '').toLowerCase()
          const advancedStatuses = ['waiting_cash_confirmation', 'menunggu konfirmasi kasir', 'diproses', 'dibatalkan', 'cancelled', ...COMPLETED_STATUS]
          if (advancedStatuses.includes(localStatus)) {
            fetchedOrders[existsIdx] = { ...fetchedOrders[existsIdx], ...mapped }
          }
        }
      })
    } catch (e) {}
    
    setOrders(fetchedOrders)
  }, [])

  const fetchReservations = useCallback(async () => {
    try {
      const r = await fetch(`${API}/reservations`, { 
        headers: authH(),
        cache: 'no-store'
      })
      const d = await r.json()
      if (d.success) {
        const sorted = d.data.sort((a, b) => (b.id || 0) - (a.id || 0))
        setReservations(sorted)
        localStorage.setItem('admin_reservations_cache', JSON.stringify(sorted))
      }
    } catch (e) {
      console.error('[Admin] fetchReservations failed', e)
    }
  }, [])

  const fetchReviews = useCallback(async () => {
    if (role !== 'admin') return
    try {
      const r = await fetch(`${API}/reviews`, { 
        headers: authH(),
        cache: 'no-store'
      })
      const d = await r.json()
      if (d.success) setReviews(d.data)
    } catch (e) {}
  }, [role])

  const fetchMenus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/menu`, { 
        headers: authH(),
        cache: 'no-store'
      })
      const d = await r.json()
      if (d.success) setMenus(d.data)
    } catch (e) {}
  }, [])

  const handleMenuSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData()
    formData.append('nama_menu', menuForm.nama_menu)
    formData.append('kategori', menuForm.kategori)
    formData.append('harga_modal', menuForm.harga_modal)
    formData.append('harga_jual', menuForm.harga_jual)
    formData.append('is_available', menuForm.is_available)
    if (menuFile) formData.append('foto_menu', menuFile)

    const method = editingMenu ? 'PUT' : 'POST'
    const url = editingMenu ? `${API}/menu/${editingMenu.id}` : `${API}/menu`

    try {
      const res = await fetch(url, {
        method,
        headers: { ...authH() }, 
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        showToast(editingMenu ? 'Menu diperbarui' : 'Menu ditambahkan', 'success')
        setShowMenuModal(false)
        setEditingMenu(null)
        setMenuForm({ nama_menu: '', kategori: 'makanan', harga_modal: '', harga_jual: '', is_available: 1 })
        setMenuFile(null)
        fetchMenus()
      } else {
        throw new Error(data.message)
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteMenu = async (id) => {
    confirmAction(
      'Hapus Menu?',
      'Menu ini akan dihapus secara permanen dari katalog.',
      async () => {
        try {
          const res = await fetch(`${API}/menu/${id}`, { method: 'DELETE', headers: authH() })
          const data = await res.json()
          if (data.success) {
            showToast('Menu berhasil dihapus', 'success')
            fetchMenus()
          } else {
            throw new Error(data.message)
          }
        } catch (e) {
          showToast('Gagal menghapus menu', 'error')
        }
      },
      'danger'
    )
  }

  const openEditMenu = (m) => {
    setEditingMenu(m)
    setMenuForm({
      nama_menu: m.nama_menu,
      kategori: m.kategori,
      harga_modal: m.harga_modal,
      harga_jual: m.harga_jual,
      is_available: m.is_available
    })
    setShowMenuModal(true)
  }

  const toggleMenuAvailability = async (id, currentStatus) => {
    const newStatus = (currentStatus === 1 || currentStatus === true) ? 0 : 1
    try {
      const res = await fetch(`${API}/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({ is_available: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Status menu berhasil diubah!`, 'success')
        fetchMenus()
      }
    } catch (e) {
      showToast('Gagal mengubah status menu', 'error')
    }
  }

  const updateStatus = async (id, newStatus, extraData = {}) => {
    // 1. Snapshot for rollback
    const previousOrders = [...orders]
    
    const orderToUpdate = orders.find(o => String(o.id) === String(id))
    if (!orderToUpdate) return

    const updatedOrder = { ...orderToUpdate, status: newStatus, ...extraData }

    // 2. Optimistic Update
    setOrders(prev => prev.map(o => String(o.id) === String(id) ? updatedOrder : o))
    saveOrderToLocal(updatedOrder)

    // 3. Backend Sync
    try {
      console.time(`[Admin] UpdateStatus #${id}`)
      const res = await fetch(`${API}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({ status: newStatus, ...extraData })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Pesanan #${id} diupdate ke ${newStatus}`, 'success')
        // Realtime Broadcast
        socket.emit('status_updated', { id, status: newStatus, ...extraData })
      } else {
        throw new Error(data.message)
      }
    } catch (err) {
      console.error('[Admin] UpdateStatus failed, rolling back...', err)
      setOrders(previousOrders)
      showToast(`Gagal update status: ${err.message}`, 'error')
    } finally {
      console.timeEnd(`[Admin] UpdateStatus #${id}`)
      fetchOrders()
    }
  }

  const updateReservationStatus = async (id, status) => {
    const isCancel = status === 'cancelled' || status === 'canceled'
    
    confirmAction(
      isCancel ? 'Batalkan Reservasi?' : 'Konfirmasi Reservasi?',
      isCancel ? 'Reservasi ini akan dibatalkan dan tidak dapat dikembalikan.' : 'Meja akan ditandai sebagai terisi untuk reservasi ini.',
      async () => {
        setLoading(true)
        try {
          const res = await fetch(`${API}/reservations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authH() },
            body: JSON.stringify({ status })
          })
          const data = await res.json()
          
          if (data.success) {
            // BUG FIX 2: Update state ONLY after successful 200 OK from backend
            setReservations(prev => prev.map(r => String(r.id) === String(id) ? { ...r, status } : r))
            
            showToast(`Reservasi berhasil ${isCancel ? 'dibatalkan' : 'dikonfirmasi'}`, 'success')
            socket.emit('update_reservation', { id, status })
            socket.emit('reservations_updated')
          } else {
            // If backend throws error (e.g. "Gagal Status tidak valid!"), 
            // the state remains "CONFIRMED" because we didn't change it optimistically.
            throw new Error(data.message)
          }
        } catch (err) {
          console.error('[Admin] UpdateReservation failed', err)
          showToast(`Gagal: ${err.message}`, 'error')
        } finally {
          setLoading(false)
          fetchReservations()
        }
      },
      isCancel ? 'danger' : 'success'
    )
  }

  useEffect(() => {
    if (tab === 'reservations') {
      fetchReservations()
    }
  }, [tab, fetchReservations])

  const cancelReservation = (id) => updateReservationStatus(id, 'canceled')

  useEffect(() => {
    // Immediate Initial Fetch
    fetchDashboard()
    fetchOrders()
    fetchReservations()
    fetchReviews()
    fetchMenus()

    // Real-time Event Listeners (Event-Driven, No Polling)
    socket.on('new_reservation', () => {
        console.log('[Admin] Realtime: New Reservation Detected')
        fetchReservations()
    })
    socket.on('update_reservation', () => {
        console.log('[Admin] Realtime: Reservation Update Detected')
        fetchReservations()
    })
    socket.on('reservations_updated', () => {
        console.log('[Admin] Realtime: Global Reservations Update Detected')
        fetchReservations()
    })
    socket.on('new_order', () => {
        console.log('[Admin] Realtime: New Order Detected')
        fetchOrders()
    })
    socket.on('status_updated', () => {
        console.log('[Admin] Realtime: Order Status Update Detected')
        fetchOrders()
    })
    socket.on('refresh_kds', () => {
        console.log('[Admin] Realtime: KDS Refresh Requested')
        fetchOrders()
    })

    const handleStorage = () => {
      fetchOrders()
      fetchReservations()
    }
    window.addEventListener('storage', handleStorage)
    
    return () => {
      socket.off('new_reservation')
      socket.off('update_reservation')
      socket.off('reservations_updated')
      socket.off('new_order')
      socket.off('status_updated')
      socket.off('refresh_kds')
      window.removeEventListener('storage', handleStorage)
    }
  }, [fetchDashboard, fetchOrders, fetchReservations, fetchReviews, fetchMenus])

  // PDF Export Logic
  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.text('MejaKita Financial Report', 14, 20)
    doc.setFontSize(12)
    doc.text(`Periode: ${dateFilter.start || 'Semua'} s/d ${dateFilter.end || 'Sekarang'}`, 14, 30)
    
    const tableData = [
      ['Total Pesanan Selesai', stats?.total_pesanan_selesai || 0],
      ['Pemasukan Kotor', fmt(stats?.pemasukan_kotor)],
      ['Laba Bersih', fmt(stats?.laba_bersih)],
    ]

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: '#FF7A00' }
    })

    const finalY = doc.lastAutoTable?.finalY || 70
    doc.text('Top Selling Menus', 14, finalY + 20)
    const menuTable = stats?.top_menus?.map(m => [m.nama_menu, m.total_terjual]) || []
    autoTable(doc, {
      startY: finalY + 25,
      head: [['Menu Name', 'Total Sold']],
      body: menuTable,
      theme: 'striped'
    })

    const fileName = `MejaKita_Report_${dateFilter.start || 'All'}_to_${dateFilter.end || 'Now'}.pdf`
    doc.save(fileName)
    showToast('Report berhasil diunduh', 'success')
  }

  const confirmAction = (title, desc, onConfirm, type = 'info') => {
    setConfirmModal({ show: true, title, desc, onConfirm, type })
  }

  const deleteReview = async (id) => {
    confirmAction(
      'Hapus Ulasan?',
      'Ulasan ini akan dihapus secara permanen dari sistem.',
      async () => {
        try {
          const res = await fetch(`${API}/reviews/${id}`, {
            method: 'DELETE',
            headers: authH()
          })
          const data = await res.json()
          if (data.success) {
            showToast('Ulasan berhasil dihapus', 'success')
            fetchReviews()
          } else {
            throw new Error(data.message)
          }
        } catch (e) {
          showToast('Gagal menghapus ulasan', 'error')
        }
      },
      'danger'
    )
  }

  const StatCard = ({ title, value, icon: Icon, color, sub }) => (
    <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110`} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{title}</div>
          <div className="text-3xl font-syne font-black text-gray-900 dark:text-white mb-1">{value}</div>
          <div className="text-[11px] text-gray-500 font-medium">{sub}</div>
        </div>
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
          <Icon className={color.replace('bg-', 'text-')} size={24} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="page bg-bg min-h-screen">
      {/* ADMIN HEADER */}
      <div className="bg-white dark:bg-[#1A1A1A] px-8 py-12 md:px-16 transition-colors duration-300 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-or/10 text-or text-[10px] font-black uppercase tracking-widest rounded-full">{role.toUpperCase()} Center</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-syne font-black text-gray-900 dark:text-white tracking-tighter">Command Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { fetchDashboard(); fetchOrders(); fetchReservations(); fetchReviews(); fetchMenus(); }}
              className="p-4 bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-or rounded-2xl transition-all"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={exportPDF}
              className="px-8 py-4 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-105 transition-all flex items-center gap-3"
            >
              <FileText size={18} />
              Export Financial PDF
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN TABS */}
      <div className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex gap-4 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === t.id ? 'bg-or text-white shadow-glow-or' : 'bg-white dark:bg-white/5 text-gray-400 border border-gray-100 dark:border-white/10'
              }`}
            >
              <t.ico size={16} />
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-12">
        {/* FILTERS */}
        {(tab === 'dashboard' || tab === 'reports') && (
          <div className="mb-12 flex flex-col lg:flex-row gap-6 items-end animate-fadeUp">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mulai Dari</label>
                <input 
                  type="date" 
                  value={dateFilter.start} 
                  onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                  className="w-full p-4 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-or outline-none transition-all dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sampai Dengan</label>
                <input 
                  type="date" 
                  value={dateFilter.end} 
                  onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                  className="w-full p-4 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-or outline-none transition-all dark:text-white"
                />
              </div>
              <div className="lg:col-span-2 flex items-end gap-2">
                <button onClick={() => setPresetFilter('today')} className="flex-1 py-4 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-or hover:text-white transition-all dark:text-gray-400">Hari Ini</button>
                <button onClick={() => setPresetFilter('month')} className="flex-1 py-4 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-or hover:text-white transition-all dark:text-gray-400">Bulan Ini</button>
                <button onClick={() => setPresetFilter('year')} className="flex-1 py-4 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-or hover:text-white transition-all dark:text-gray-400">Tahun Ini</button>
                <button onClick={() => setPresetFilter('all')} className="flex-1 py-4 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-or hover:text-white transition-all dark:text-gray-400">Semua</button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics TAB */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-12 animate-fadeUp">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard title="Revenue (Gross)" value={fmt(stats.pemasukan_kotor)} icon={DollarSign} color="bg-or" sub={`Periode: ${dateFilter.start || 'Semua'}`} />
              <StatCard title="Net Profit" value={fmt(stats.laba_bersih)} icon={TrendingUp} color="bg-green-500" sub="Setelah dikurangi modal" />
              <StatCard title="Total Orders" value={stats.total_pesanan_selesai || 0} icon={Package} color="bg-blue-500" sub="Pesanan berstatus selesai" />
              <StatCard title="Total Bookings" value={reservations.length} icon={Calendar} color="bg-purple-500" sub="Reservasi mendatang" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5">
                <h3 className="text-xl font-syne font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                  <TrendingUp size={20} className="text-or" /> Revenue Trends
                </h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.daily_sales || []}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF7A00" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={v => `Rp${v/1000}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [fmt(value), 'Revenue']}
                      />
                      <Area type="monotone" dataKey="total" stroke="#FF7A00" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1A1A1A] p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5">
                <h3 className="text-xl font-syne font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                  <Star size={20} className="text-or" /> Top Selling
                </h3>
                <div className="space-y-6">
                  {stats.top_menus?.map((m, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center font-black text-or">#{i+1}</div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{m.nama_menu}</div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{m.total_terjual} terjual</div>
                      </div>
                      <div className="w-24 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-or" style={{ width: `${(m.total_terjual / (stats.top_menus[0].total_terjual || 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports TAB */}
        {tab === 'reports' && stats && (
          <div className="space-y-12 animate-fadeUp">
            <div className="bg-white dark:bg-[#1A1A1A] p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                <div>
                  <h3 className="text-3xl font-syne font-black text-gray-900 dark:text-white tracking-tighter mb-2">Financial Summary</h3>
                  <p className="text-gray-500 text-sm font-medium">Laporan pendapatan dan statistik menu terlaris.</p>
                </div>
                <button 
                  onClick={exportPDF}
                  className="px-10 py-5 bg-or text-white font-black rounded-[1.5rem] shadow-glow-or hover:scale-105 transition-all flex items-center gap-4"
                >
                  <FileText size={20} />
                  Download Full PDF Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem]">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Pesanan</div>
                  <div className="text-4xl font-syne font-black text-gray-900 dark:text-white">{stats.total_pesanan_selesai}</div>
                </div>
                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem]">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pendapatan Kotor</div>
                  <div className="text-4xl font-syne font-black text-or">{fmt(stats.pemasukan_kotor)}</div>
                </div>
                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem]">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Laba Bersih</div>
                  <div className="text-4xl font-syne font-black text-green-500">{fmt(stats.laba_bersih)}</div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-white/5 pt-12">
                <h4 className="text-xl font-syne font-black text-gray-900 dark:text-white mb-8">Top Selling Performance</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">
                        <th className="px-6 py-6">Menu Name</th>
                        <th className="px-6 py-6 text-center">Total Sold</th>
                        <th className="px-6 py-6 text-right">Popularity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {stats.top_menus?.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-6 font-bold text-gray-900 dark:text-white flex items-center gap-4">
                            <span className="w-8 h-8 bg-or/10 text-or text-xs font-black rounded-lg flex items-center justify-center">#{i+1}</span>
                            {m.nama_menu}
                          </td>
                          <td className="px-6 py-6 text-center font-black text-gray-600 dark:text-gray-400">{m.total_terjual} Porsi</td>
                          <td className="px-6 py-6 text-right">
                            <div className="flex justify-end items-center gap-3">
                              <div className="w-32 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-or" style={{ width: `${(m.total_terjual / (stats.top_menus[0]?.total_terjual || 1)) * 100}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-or">{Math.round((m.total_terjual / (stats.top_menus[0]?.total_terjual || 1)) * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Menu TAB */}
        {tab === 'menus_admin' && (
          <div className="animate-fadeUp">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-syne font-black text-gray-900 dark:text-white">Product Catalog</h3>
               <button 
                onClick={() => { setEditingMenu(null); setMenuForm({ nama_menu: '', kategori: 'makanan', harga_modal: '', harga_jual: '', is_available: 1 }); setShowMenuModal(true); }}
                className="px-6 py-3 bg-or text-white font-black rounded-xl shadow-glow-or hover:scale-105 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
               >
                 <Utensils size={14} /> Add New Menu
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {menus.map(m => (
                <div key={m.id} className="bg-white dark:bg-[#1A1A1A] p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 relative group transition-all hover:shadow-xl">
                   <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditMenu(m)} className="p-2 bg-white/90 dark:bg-black/50 backdrop-blur-md rounded-lg text-blue-500 shadow-sm border border-white/20 hover:scale-110 transition-all"><RefreshCw size={14} /></button>
                      <button onClick={() => deleteMenu(m.id)} className="p-2 bg-white/90 dark:bg-black/50 backdrop-blur-md rounded-lg text-red-500 shadow-sm border border-white/20 hover:scale-110 transition-all"><Trash2 size={14} /></button>
                   </div>

                   <div className="relative h-40 rounded-3xl overflow-hidden mb-6">
                      <img src={m.foto_menu ? `${CDN}/${m.foto_menu}` : PHS} className={`w-full h-full object-cover ${m.is_available ? '' : 'grayscale'}`} alt={m.nama_menu} />
                      <div className={`absolute inset-0 flex items-center justify-center ${m.is_available ? 'bg-transparent' : 'bg-black/40 backdrop-blur-[2px]'}`}>
                         {!m.is_available && <span className="px-4 py-2 bg-red-600 text-white font-black text-[10px] uppercase rounded-xl border border-white/20">Sold Out</span>}
                      </div>
                   </div>
                   <div className="mb-6">
                      <h4 className="font-syne font-black text-gray-900 dark:text-white line-clamp-1 mb-1">{m.nama_menu}</h4>
                      <div className="flex items-center gap-2">
                        {m.kategori === 'makanan' ? <Utensils size={10} className="text-or" /> : <CupSoda size={10} className="text-or" />}
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.kategori}</p>
                      </div>
                      <div className="mt-2 text-sm font-black text-or">{fmt(m.harga_jual)}</div>
                   </div>
                   <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-white/5">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-gray-400 uppercase">Status</span>
                         <span className={`text-xs font-black ${m.is_available ? 'text-green-500' : 'text-red-500'}`}>{m.is_available ? 'Available' : 'Sold Out'}</span>
                      </div>
                      <button 
                        onClick={() => toggleMenuAvailability(m.id, m.is_available)}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          m.is_available 
                          ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' 
                          : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'
                        }`}
                      >
                        {m.is_available ? 'Set Sold Out' : 'Set Available'}
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Orders TAB */}
        {tab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeUp">
            {orders.map(o => {
              const isComp = COMPLETED_STATUS.includes((o.status || '').toLowerCase())
              return (
                <div key={o.id} className="bg-white dark:bg-[#1A1A1A] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-2 h-full ${isComp ? 'bg-green-500' : 'bg-or'}`} />
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</div>
                      <div className="text-2xl font-syne font-black text-gray-900 dark:text-white">#{o.id}</div>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      o.status === 'menunggu konfirmasi kasir' || o.status === 'waiting_cash_confirmation' ? 'bg-yellow-100 text-yellow-700' :
                      o.status === 'dibatalkan' || o.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      isComp ? 'bg-green-500/10 text-green-500' : 'bg-or/10 text-or'
                    }`}>
                      {o.status}
                    </span>
                  </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                    <Users size={16} className="text-or" /> {o.pelanggan || 'Guest'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                    <LayoutDashboard size={16} className="text-or" /> Meja {o.nomor_meja}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                    <Calendar size={16} className="text-or" /> {fmtDate(o.waktu_pesan)}
                  </div>
                </div>
                <div className="flex flex-col gap-4 pt-6 border-t border-gray-100 dark:border-white/5">
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</div>
                    <div className="text-xl font-syne font-black text-or">{fmt(o.total_pembayaran)}</div>
                  </div>
                  
                  <div className="flex flex-row gap-2 mt-2">
                    {(o.status === 'waiting_cash_confirmation' || o.status === 'menunggu konfirmasi kasir' || o.status === 'menunggu pembayaran') && (
                      <button 
                        onClick={() => updateStatus(o.id, 'diproses', { paymentStatus: 'paid', confirmedAt: new Date().toISOString() })}
                        className="flex-1 py-3 bg-green-500 text-white font-black rounded-xl shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <CheckCircle size={14} /> Konfirmasi
                      </button>
                    )}

                    {o.status === 'diproses' && (
                      <button 
                        onClick={() => updateStatus(o.id, 'selesai')}
                        className="flex-1 py-3 bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <Package size={14} /> Selesai
                      </button>
                    )}

                    {!isComp && o.status !== 'dibatalkan' && (
                      <button 
                        onClick={() => updateStatus(o.id, 'dibatalkan', { paymentStatus: 'cancelled', cancelledAt: new Date().toISOString() })}
                        className="flex-1 py-3 bg-red-500/10 text-red-500 font-black rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <X size={14} /> Batal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        {/* REVIEWS ADMIN TAB */}
        {tab === 'reviews_admin' && (
          <div className="space-y-8 animate-fadeUp">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
               <StatCard title="Average Rating" value={(reviews.reduce((s,r)=>s+r.rating,0)/(reviews.length||1)).toFixed(1)} icon={Star} color="bg-yw" sub="Customer satisfaction" />
               <StatCard title="Total Reviews" value={reviews.length} icon={MessageSquare} color="bg-or" sub="Feedback entries" />
             </div>
             <div className="bg-white dark:bg-[#1A1A1A] rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">
                      <th className="px-10 py-6">Customer</th>
                      <th className="px-10 py-6">Rating</th>
                      <th className="px-10 py-6">Comment</th>
                      <th className="px-10 py-6">Date</th>
                      <th className="px-10 py-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {reviews.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-10 py-6 font-bold text-gray-900 dark:text-white">{r.nama_user || 'Guest'}</td>
                        <td className="px-10 py-6">
                           <div className="flex gap-0.5">
                             {[1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= r.rating ? "var(--or)" : "none"} className={s <= r.rating ? "text-or" : "text-gray-200"} />)}
                           </div>
                        </td>
                        <td className="px-10 py-6 text-sm text-gray-500 italic max-w-xs truncate">"{r.komentar}"</td>
                        <td className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase">{fmtDate(r.created_at)}</td>
                        <td className="px-10 py-6 text-right">
                          <button onClick={() => deleteReview(r.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                             <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Reservations TAB */}
        {tab === 'reservations' && (
          <div className="bg-white dark:bg-[#1A1A1A] rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="p-10 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
               <h3 className="text-2xl font-syne font-black text-gray-900 dark:text-white">Upcoming Bookings</h3>
               <span className="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-2xl text-xs font-black">{reservations.length} Active</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">
                    <th className="px-10 py-6">Customer</th>
                    <th className="px-10 py-6">WhatsApp</th>
                    <th className="px-10 py-6 text-center">Table</th>
                    <th className="px-10 py-6 text-center">Pax</th>
                    <th className="px-10 py-6">Scheduled</th>
                    <th className="px-10 py-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {reservations.length === 0 ? (
                    <tr><td colSpan="6" className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">Belum ada data reservasi</td></tr>
                  ) : reservations.map(res => (
                    <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-10 py-6 font-bold text-gray-900 dark:text-white">{res.nama_tamu}</td>
                      <td className="px-10 py-6 font-bold text-or">{res.nomor_wa}</td>
                      <td className="px-10 py-6 text-center font-black text-gray-700 dark:text-gray-300">Meja {res.nomor_meja || '--'}</td>
                      <td className="px-10 py-6 text-center">
                        <span className="bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg text-xs font-black">{res.jumlah_orang}</span>
                      </td>
                      <td className="px-10 py-6 text-sm font-medium text-gray-500">{new Date(res.waktu_reservasi).toLocaleString()}</td>
                      <td className="px-10 py-6 text-right">
                        {res.status === 'cancelled' || res.status === 'canceled' ? (
                          <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                        ) : res.status === 'confirmed' ? (
                          <div className="flex justify-end gap-2">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest">Confirmed</span>
                            <button onClick={() => updateReservationStatus(res.id, 'canceled')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                             <button 
                                onClick={() => updateReservationStatus(res.id, 'confirmed')}
                                className="px-4 py-2 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2"
                              >
                                <CheckCircle size={12} /> Konfirmasi
                              </button>
                              <button onClick={() => updateReservationStatus(res.id, 'canceled')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                <X size={14} />
                              </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MENU CRUD MODAL */}
      {showMenuModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-xl rounded-[3rem] p-10 shadow-2xl relative animate-bounceIn border border-white/10 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowMenuModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-or transition-colors"><X size={24} /></button>
            
            <h3 className="text-3xl font-syne font-black text-gray-900 dark:text-white mb-2 tracking-tighter">
              {editingMenu ? 'Edit Menu' : 'Add New Menu'}
            </h3>
            <p className="text-gray-500 text-sm mb-10 font-medium">Lengkapi detail hidangan di bawah ini.</p>

            <form onSubmit={handleMenuSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Menu</label>
                  <input 
                    required
                    value={menuForm.nama_menu}
                    onChange={e => setMenuForm({...menuForm, nama_menu: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:border-or transition-all text-sm font-bold" 
                    placeholder="Contoh: Nasi Goreng" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori</label>
                  <select 
                    value={menuForm.kategori}
                    onChange={e => setMenuForm({...menuForm, kategori: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:border-or transition-all text-sm font-bold"
                  >
                    <option value="makanan">Makanan</option>
                    <option value="minuman">Minuman</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Modal</label>
                  <input 
                    required
                    type="number"
                    value={menuForm.harga_modal}
                    onChange={e => setMenuForm({...menuForm, harga_modal: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:border-or transition-all text-sm font-bold" 
                    placeholder="15000" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Jual</label>
                  <input 
                    required
                    type="number"
                    value={menuForm.harga_jual}
                    onChange={e => setMenuForm({...menuForm, harga_jual: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:border-or transition-all text-sm font-bold" 
                    placeholder="25000" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foto Menu</label>
                <div className="flex items-center gap-4">
                  {editingMenu && !menuFile && (
                    <img src={`${CDN}/${editingMenu.foto_menu}`} className="w-16 h-16 rounded-xl object-cover" alt="prev" />
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={e => setMenuFile(e.target.files[0])}
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:border-or transition-all text-sm font-bold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-or file:text-white file:uppercase" 
                  />
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-5 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                  {editingMenu ? 'Save Changes' : 'Create Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl relative animate-bounceIn border border-white/10 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              confirmModal.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
            }`}>
              {confirmModal.type === 'danger' ? <AlertTriangle size={40} /> : <CheckCircle size={40} />}
            </div>
            
            <h3 className="text-2xl font-syne font-black text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium leading-relaxed">{confirmModal.desc}</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="flex-1 py-4 bg-gray-50 dark:bg-white/5 text-gray-400 font-black rounded-2xl hover:bg-gray-100 transition-all text-xs uppercase tracking-widest"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, show: false });
                }}
                className={`flex-1 py-4 text-white font-black rounded-2xl shadow-lg transition-all text-xs uppercase tracking-widest ${
                  confirmModal.type === 'danger' ? 'bg-red-500 shadow-red-500/20' : 'bg-green-500 shadow-green-500/20'
                }`}
              >
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
