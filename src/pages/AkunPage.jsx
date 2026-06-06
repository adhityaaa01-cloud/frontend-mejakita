import { useState, useEffect } from 'react'
import { getName, getPoin, clearUser, getUID, getHistoryByUser, fmt, fmtDate, API, authH, COMPLETED_STATUS, USER_KEYS, getScopedKey } from '../utils/auth'
import { User, LogOut, History, Star, Settings, ChevronRight, Package, Clock, MapPin, Calendar, CheckCircle2, X } from 'lucide-react'

export default function AkunPage({ setPage, showToast, onLogout }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  
  const user = {
    nama: getName(),
    uid: getUID(),
    poin: getPoin()
  }

  useEffect(() => {
    const loadData = () => {
      const localHistory = getHistoryByUser(user.uid)
      setHistory(localHistory)
    }

    loadData()
    window.addEventListener('storage', loadData)
    
    // Optional: Fetch remote history too
    if (user.uid && user.uid !== 'guest') {
      ;(async () => {
        setLoading(true)
        try {
          const res = await fetch(`${API}/orders/user/${user.uid}`, { 
            headers: authH(),
            cache: 'no-store'
          })
          const data = await res.json()
          if (data.success) {
            setHistory(prev => {
               const combined = [...prev]
               data.data.forEach(d => {
                 const orderId = d.id_order || d.id
                 if (!combined.find(c => (String(c.id) === String(orderId) || String(c.id_order) === String(orderId)))) {
                   combined.push(d)
                 }
               })
               
               return combined
                .filter(o => COMPLETED_STATUS.includes((o.status || '').toLowerCase()))
                .sort((a, b) => new Date(b.created_at || b.updatedAt || b.waktu_pesan) - new Date(a.created_at || a.updatedAt || a.waktu_pesan))
            })
          }
        } catch (e) {
          console.error('Failed to fetch remote history', e)
        }
        finally { setLoading(false) }
      })()
    }

    return () => window.removeEventListener('storage', loadData)
  }, [user.uid])

  return (
    <div className="page bg-bg min-h-screen pb-24">
      <div className="ph py-16 md:py-24">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 bg-gradient-to-br from-or to-or3 rounded-[2.5rem] flex items-center justify-center text-white text-5xl shadow-glow-or animate-bounceIn">
            {user.nama.charAt(0).toUpperCase()}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-syne font-black text-gray-900 dark:text-white mb-2 tracking-tighter">{user.nama}</h1>
            <p className="text-gray-500 font-bold flex items-center justify-center md:justify-start gap-2">
              <span className="w-2 h-2 bg-gn rounded-full"></span> Online • Member Premium
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* LOYALTY CARD */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] rounded-[3rem] p-10 text-white shadow-2xl mb-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-or/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-or/20 transition-all duration-700"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Loyalty Points</div>
                <div className="text-4xl font-syne font-black flex items-center gap-3">
                  <Star className="text-or fill-or" size={32} />
                  {user.poin} <span className="text-sm opacity-40 font-bold uppercase tracking-widest">Points</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Member ID</div>
                <div className="text-xl font-syne font-black opacity-90">#{user.uid?.toString().slice(0, 8)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span>Progress ke Reward Berikutnya</span>
                <span>{user.poin % 5}/5 Stamps</span>
              </div>
              <div className="h-4 bg-white/5 rounded-full p-1 border border-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-or to-or3 rounded-full shadow-[0_0_15px_rgba(255,165,0,0.5)] transition-all duration-1000" style={{ width: `${(user.poin % 5) * 20}%` }}></div>
              </div>
              <p className="text-[10px] text-white/40 font-medium">Kumpulkan 5 stamp untuk mendapatkan Diskon 50% pada pesanan berikutnya!</p>
            </div>
          </div>
        </div>

        {/* ORDER HISTORY */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4 px-2">
             <h3 className="text-xl font-syne font-black text-gray-900 dark:text-white flex items-center gap-3">
                <History className="text-or" size={24} /> Riwayat Pesanan
             </h3>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{history.length} Selesai</span>
          </div>

          {history.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] p-16 text-center border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center">
               <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-xl opacity-20 text-gray-400">
                  <Package size={40} />
               </div>
               <h4 className="text-lg font-syne font-black text-gray-400 uppercase tracking-widest mb-2">Belum ada riwayat</h4>
               <p className="text-xs text-gray-500 max-w-xs mx-auto">Pesanan yang sudah selesai akan muncul di sini secara otomatis.</p>
            </div>
          ) : (
            history.map((h, i) => {
              const isComp = COMPLETED_STATUS.includes((h.status || '').toLowerCase())
              return (
                <div key={h.id || i} className="bg-white dark:bg-[#1A1A1A] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-xl transition-all group animate-fadeUp" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 ${
                          (h.status || '').toLowerCase() === 'dibatalkan' || (h.status || '').toLowerCase() === 'cancelled' 
                            ? 'bg-red-100 text-red-600' 
                            : isComp ? 'bg-gn/10 text-gn' : 'bg-or/10 text-or'
                        } text-[9px] font-black uppercase tracking-widest rounded-full`}>
                          {(h.status || '').toLowerCase() === 'dibatalkan' || (h.status || '').toLowerCase() === 'cancelled'
                             ? <><X size={10} className="inline mr-1" /> {h.status}</>
                             : isComp ? <><CheckCircle2 size={10} className="inline mr-1" /> {h.status}</> : h.status}
                        </span>
                        <span className="text-sm font-syne font-black text-gray-900 dark:text-white">Order #{h.id_order || h.id}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={10} /> Tanggal</div>
                          <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmtDate(h.created_at || h.updatedAt || h.waktu_pesan)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10} /> Meja</div>
                          <div className="text-xs font-bold text-gray-700 dark:text-gray-300">No. {h.nomor_meja || '--'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={10} /> Pembayaran</div>
                          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{h.metode_bayar || 'Tunai'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-4 md:border-l border-gray-50 dark:border-white/5 md:pl-8">
                      <div className="text-right">
                         <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bill</div>
                         <div className="text-xl font-syne font-black text-or">{fmt(h.total_pembayaran || h.total_akhir)}</div>
                      </div>
                      <button className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 group-hover:text-or group-hover:bg-or/10 transition-all">
                         <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ACTIONS */}
        <div className="mt-16 pt-10 border-t border-gray-100 dark:border-white/5 space-y-4">
           <button 
            onClick={onLogout}
            className="w-full py-5 bg-red-50 text-red-500 font-black rounded-3xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm"
           >
             <LogOut size={20} /> Keluar dari Akun
           </button>
           <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-[0.2em]">MejaKita Premium Membership v2.0</p>
        </div>
      </div>
    </div>
  )
}
