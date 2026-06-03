import { useState, useEffect, useCallback } from 'react'
import socket from '../utils/socket'
import { API, authH, fmt, fmtDate, KEYS, saveOrderToLocal, COMPLETED_STATUS } from '../utils/auth'
import { Package, CheckCircle, Clock, Search, Filter, DollarSign, ArrowRight, Calendar, Users, X, ClipboardList } from 'lucide-react'

export default function KasirPage({ showToast, activeOrder, setActiveOrder }) {
  const [orders, setOrders] = useState([])
  const [reservations, setReservations] = useState([])
  const [tab, setTab] = useState('orders') // orders | reservations
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('semua') 
  const [search, setSearch] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let fetchedOrders = []
    
    // 1. Try fetching from API
    try {
      const res = await fetch(`${API}/orders`, { headers: authH() })
      const data = await res.json()
      if (data.success) fetchedOrders = data.data
    } catch (err) {
      console.warn('Backend offline, using local simulation for Kasir Dashboard')
    }

    // 2. Merge with Master Orders from LocalStorage (Aggregate all users)
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
        const isComp = COMPLETED_STATUS.includes((mo.status || '').toLowerCase())
        
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
          // Sync status from local if local is more "advanced" (for simulation)
          const localStatus = (mo.status || '').toLowerCase()
          const advancedStatuses = ['waiting_cash_confirmation', 'menunggu konfirmasi kasir', 'diproses', 'dibatalkan', 'cancelled', ...COMPLETED_STATUS]
          
          if (advancedStatuses.includes(localStatus)) {
            fetchedOrders[existsIdx] = { ...fetchedOrders[existsIdx], ...mapped }
          }
        }
      })
    } catch (e) {
      console.error('Failed to parse master orders', e)
    }

    setOrders(fetchedOrders)
    setLoading(false)
  }, [showToast])

  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/reservations`, { headers: authH() })
      const data = await res.json()
      if (data.success) setReservations(data.data)
    } catch (err) {}
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchReservations()
    socket.on('new_order', () => fetchOrders())
    socket.on('refresh_kds', () => fetchOrders())
    socket.on('new_reservation', () => fetchReservations())
    socket.on('update_reservation', () => fetchReservations())
    
    const handleStorage = () => fetchOrders()
    window.addEventListener('storage', handleStorage)

    return () => {
      socket.off('new_order')
      socket.off('refresh_kds')
      socket.off('new_reservation')
      socket.off('update_reservation')
      window.removeEventListener('storage', handleStorage)
    }
  }, [fetchOrders, fetchReservations])

  const updateStatus = async (id, newStatus, extraData = {}) => {
    // 1. Get current order data from state
    const orderToUpdate = orders.find(o => String(o.id) === String(id))
    if (!orderToUpdate) return

    const updatedOrder = { ...orderToUpdate, status: newStatus, ...extraData }

    // 2. Local State Update for Immediate Feedback
    setOrders(prev => prev.map(o => String(o.id) === String(id) ? updatedOrder : o))

    // 3. Persistence Update
    saveOrderToLocal(updatedOrder)
    
    // 4. Also clean up any other user-specific storage keys (redundancy)
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mejakita_orders_')) {
          const items = JSON.parse(localStorage.getItem(key) || '[]')
          const idx = items.findIndex(o => String(o.id || o.id_order) === String(id))
          if (idx >= 0) {
             items[idx] = { ...items[idx], status: newStatus, ...extraData }
             localStorage.setItem(key, JSON.stringify(items))
          }
        }
      })
    } catch (e) {}

    // 5. Sync with Active User if it's their order
    if (activeOrder && (String(activeOrder.id_order) === String(id) || String(activeOrder.id) === String(id))) {
      setActiveOrder(prev => ({ ...prev, status: newStatus, ...extraData }))
    }

    // 6. API Sync (Optional/Background)
    try {
      const res = await fetch(`${API}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({ status: newStatus, ...extraData })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Pesanan #${id} diupdate ke ${newStatus}`, 'success')
      }
    } catch (err) {
      console.warn('API Sync failed, but local update was successful')
      showToast(`Pesanan #${id} diupdate secara lokal`, 'info')
    }
    
    // Refresh list to apply filters correctly
    fetchOrders()
  }

  const updateReservationStatus = async (id, newStatus) => {
    const action = newStatus === 'confirmed' ? 'mengonfirmasi' : 'membatalkan'
    if (!window.confirm(`Yakin ingin ${action} reservasi ini?`)) return
    
    setLoading(true)
    try {
      // 1. Update backend
      const res = await fetch(`${API}/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      
      if (data.success) {
        showToast(`Reservasi berhasil diupdate ke ${newStatus}`, 'success')
        
        // 2. Update local state
        setReservations(prev => prev.map(r => String(r.id) === String(id) ? { ...r, status: newStatus } : r))

        // 3. Sync localStorage (for simulation/redundancy)
        try {
          const saved = JSON.parse(localStorage.getItem(KEYS.RESERVATIONS) || '[]')
          const updated = saved.map(r => String(r.id) === String(id) ? { ...r, status: newStatus } : r)
          localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(updated))
          window.dispatchEvent(new Event('storage'))
        } catch (e) {}
      } else {
        showToast(data.message || 'Gagal update reservasi', 'error')
      }
    } catch (err) {
      console.error('Update Reservation Error:', err)
      showToast('Gagal update status reservasi', 'error')
    } finally {
      setLoading(false)
      fetchReservations() // Refresh data from API
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'semua' || o.status === filter
    const matchesSearch = o.id.toString().includes(search) || (o.pelanggan || '').toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const totalToday = orders
    .filter(o => {
      // 1. Status Filter: Only paid/processed orders
      const isPaid = !['menunggu pembayaran', 'menunggu konfirmasi kasir', 'waiting_cash_confirmation', 'dibatalkan', 'cancelled'].includes((o.status || '').toLowerCase())
      
      // 2. Date Filter: Only orders from TODAY (Resets daily)
      const orderDate = new Date(o.waktu_pesan || o.created_at || o.updatedAt).toDateString()
      const todayDate = new Date().toDateString()
      const isToday = orderDate === todayDate
      
      return isPaid && isToday
    })
    .reduce((sum, o) => sum + (parseInt(o.total_pembayaran) || 0), 0)

  return (
    <div className="page bg-bg min-h-screen pb-24">
      {/* HEADER */}
      <div className="bg-white dark:bg-[#1A1A1A] px-6 py-12 md:px-12 transition-colors duration-300 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full">Kasir Dashboard</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-syne font-black text-gray-900 dark:text-white tracking-tighter">Point of Sale</h1>
          </div>
          
          <div className="bg-or text-white p-6 md:p-8 rounded-[2rem] shadow-glow-or flex items-center gap-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Pemasukan Hari Ini</div>
              <div className="text-2xl md:text-3xl font-syne font-black">{fmt(totalToday)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex gap-4 bg-white/50 dark:bg-black/20 backdrop-blur-md">
        <button 
          onClick={() => setTab('orders')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'orders' ? 'bg-or text-white' : 'text-gray-400'}`}
        >
          <Package size={16} /> Pesanan Aktif
        </button>
        <button 
          onClick={() => setTab('reservations')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'reservations' ? 'bg-or text-white' : 'text-gray-400'}`}
        >
          <Calendar size={16} /> Reservasi Meja
        </button>
      </div>

      {tab === 'orders' ? (
        <>
          <div className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 py-6">
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row gap-6 items-center">
              <div className="flex gap-2 p-1 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 overflow-x-auto no-scrollbar w-full md:w-auto">
                {['semua', 'waiting_cash_confirmation', 'menunggu konfirmasi kasir', 'diproses', 'selesai', 'dibatalkan'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      filter === f ? 'bg-or text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {f.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 group w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-or transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Cari ID Order atau Pelanggan..."
                  className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:ring-2 ring-or/20 transition-all text-sm font-bold"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="max-w-[1400px] mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full py-20 text-center animate-fadeIn flex flex-col items-center">
                  <div className="w-24 h-24 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-xl opacity-20 text-gray-400">
                    <ClipboardList size={40} />
                  </div>
                  <h3 className="text-xl font-syne font-black text-gray-400 uppercase tracking-widest">Tidak ada pesanan ditemukan</h3>
                </div>
              ) : (
                filteredOrders.map(o => {
                  const isComp = COMPLETED_STATUS.includes((o.status || '').toLowerCase())
                  return (
                    <div key={o.id} className="bg-white dark:bg-[#1A1A1A] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group hover:shadow-xl transition-all animate-fadeUp">
                      <div className={`absolute top-0 left-0 w-2 h-full ${
                        o.status === 'menunggu konfirmasi kasir' ? 'bg-yellow-400 animate-pulse' : 
                        isComp ? 'bg-green-500' : 'bg-or'
                      }`} />
                      
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</div>
                          <div className="text-3xl font-syne font-black text-gray-900 dark:text-white">#{o.id}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            o.status === 'menunggu konfirmasi kasir' || o.status === 'waiting_cash_confirmation' ? 'bg-yellow-100 text-yellow-700' :
                            o.status === 'dibatalkan' || o.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                            isComp ? 'bg-green-100 text-green-700' : 'bg-or/10 text-or'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-or"><Search size={14} /></div>
                        <span>{o.pelanggan || 'Guest'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-or"><Filter size={14} /></div>
                        <span>Meja {o.nomor_meja}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-or"><Clock size={14} /></div>
                        <span>{fmtDate(o.waktu_pesan)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-6 border-t border-gray-100 dark:border-white/5">
                      <div className="flex justify-between items-end">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</div>
                        <div className="text-2xl font-syne font-black text-or">{fmt(o.total_pembayaran)}</div>
                      </div>
                      
                      <div className="flex flex-row gap-2 mt-2">
                        {(o.status === 'waiting_cash_confirmation' || o.status === 'menunggu konfirmasi kasir' || o.status === 'menunggu pembayaran') && (
                          <button 
                            onClick={() => updateStatus(o.id, 'diproses', { paymentStatus: 'paid', confirmedAt: new Date().toISOString() })}
                            className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
                          >
                            <CheckCircle size={16} /> Konfirmasi
                          </button>
                        )}
                        
                        {o.status === 'diproses' && (
                          <button 
                            onClick={() => updateStatus(o.id, 'selesai')}
                            className="flex-1 py-4 bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
                          >
                            <Package size={16} /> Selesai
                          </button>
                        )}

                        {!isComp && o.status !== 'dibatalkan' && (
                          <button 
                            onClick={() => updateStatus(o.id, 'dibatalkan', { paymentStatus: 'cancelled', cancelledAt: new Date().toISOString() })}
                            className="flex-1 py-4 bg-red-500/10 text-red-500 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs"
                          >
                            <X size={16} /> Batal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </>
    ) : (
        <div className="max-w-[1400px] mx-auto px-6 py-12">
           <div className="bg-white dark:bg-[#1A1A1A] rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden animate-fadeUp">
            <div className="p-10 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
               <h3 className="text-2xl font-syne font-black text-gray-900 dark:text-white">Upcoming Bookings</h3>
               <span className="px-4 py-2 bg-or/10 text-or rounded-2xl text-xs font-black">{reservations.length} Active</span>
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
                    <tr><td colSpan="6" className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Belum ada reservasi</td></tr>
                  ) : (
                    reservations.map(res => (
                      <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-10 py-6 font-bold text-gray-900 dark:text-white">{res.nama_tamu}</td>
                        <td className="px-10 py-6 font-bold text-or">{res.nomor_wa}</td>
                        <td className="px-10 py-6 text-center font-black text-gray-700 dark:text-gray-300">Meja {res.nomor_meja || '--'}</td>
                        <td className="px-10 py-6 text-center">
                          <span className="bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg text-xs font-black">{res.jumlah_orang}</span>
                        </td>
                        <td className="px-10 py-6 text-sm font-medium text-gray-500">{new Date(res.waktu_reservasi).toLocaleString()}</td>
                        <td className="px-10 py-6 text-right">
                          {res.status === 'canceled' || res.status === 'cancelled' ? (
                            <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                          ) : res.status === 'confirmed' ? (
                            <div className="flex justify-end gap-2 items-center">
                              <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest">Confirmed</span>
                              <button 
                                onClick={() => updateReservationStatus(res.id, 'canceled')} 
                                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                title="Batalkan Reservasi"
                              >
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
                              <button 
                                onClick={() => updateReservationStatus(res.id, 'canceled')}
                                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
