import { useState, useEffect, useCallback } from 'react'
import socket from '../utils/socket'
import { API, fmtDate, KEYS, getScopedKey, USER_KEYS } from '../utils/auth'
import { Star, Filter, ArrowUp, ArrowDown, User, MessageCircle, Sparkles } from 'lucide-react'

export default function ReviewPage({ showToast }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState(0) // 0 = semua, 1-5 = rating
  const [sort, setSort] = useState('newest') // newest | highest

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    console.log('Fetching global reviews from backend...')
    let remoteReviews = []
    
    // 1. Fetch Remote (Primary Source)
    try {
      const res = await fetch(`${API}/reviews`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        remoteReviews = data.data
        console.log(`Successfully fetched ${remoteReviews.length} reviews from backend.`)
      }
    } catch (err) {
      console.warn('Backend offline or CORS error, falling back to local storage:', err.message)
    }

    // 2. Fetch Local (Aggregate from all user-scoped keys)
    let localReviews = []
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mejakita_reviews_')) {
          const items = JSON.parse(localStorage.getItem(key) || '[]')
          if (Array.isArray(items)) localReviews = [...localReviews, ...items]
        }
      })
    } catch (e) {
      console.error('Failed to aggregate local reviews', e)
    }

    // 3. Merge & Deduplicate
    // Strategy: Start with remote reviews, then add local ones that are missing
    const merged = [...remoteReviews]
    
    localReviews.forEach(loc => {
      const existsIdx = merged.findIndex(m => 
        String(m.id) === String(loc.id) || 
        (m.id_order !== null && loc.id_order !== null && String(m.id_order) === String(loc.id_order))
      )
      
      if (existsIdx < 0) {
        // If it doesn't exist remotely, it might be a new local review
        merged.push({
          ...loc,
          nama_user: loc.nama_user || 'Pelanggan (Local)'
        })
      }
    })

    setReviews(merged)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReviews()
    
    // 1. Listen for local storage events (same machine/multi-tab)
    window.addEventListener('storage', fetchReviews)
    
    // 2. Listen for Socket events (global/real-time across all users)
    socket.on('new_review', () => {
      fetchReviews()
    })

    return () => {
      window.removeEventListener('storage', fetchReviews)
      socket.off('new_review')
    }
  }, [fetchReviews])

  const filteredReviews = reviews
    .filter(r => filter === 0 || r.rating === filter)
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at || b.tanggal) - new Date(a.created_at || a.tanggal)
      if (sort === 'highest') return b.rating - a.rating
      return 0
    })

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0

  return (
    <div className="page bg-bg min-h-screen pb-24">
      {/* HEADER */}
      <div className="bg-white dark:bg-[#1A1A1A] px-6 py-12 md:px-12 transition-colors duration-300 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-or font-black uppercase tracking-[0.3em] text-[10px] mb-2">Suara Pelanggan</div>
          <h1 className="text-4xl md:text-5xl font-syne font-black text-gray-900 dark:text-white mb-6 flex items-center justify-center gap-4">
            Ulasan & Rating <Star size={32} className="text-or" fill="var(--or)" />
          </h1>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-10">
            <div className="text-center">
              <div className="text-6xl font-syne font-black text-or mb-2">{avgRating}</div>
              <div className="flex justify-center gap-1 mb-2">
                {[1,2,3,4,5].map(i => <Star key={i} size={16} fill={i <= Math.round(avgRating) ? "var(--or)" : "none"} className={i <= Math.round(avgRating) ? "text-or" : "text-gray-200"} />)}
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{reviews.length} Total Review</div>
            </div>
            
            <div className="hidden md:block w-px h-24 bg-gray-100 dark:bg-white/10"></div>
            
            <div className="flex-1 max-w-sm space-y-2">
              {[5,4,3,2,1].map(star => {
                const count = reviews.filter(r => r.rating === star).length
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 w-4">{star}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-or transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 w-8">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 py-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="flex gap-2 p-1 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 overflow-x-auto no-scrollbar w-full md:w-auto">
            <button onClick={() => setFilter(0)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 0 ? 'bg-or text-white' : 'text-gray-400'}`}>Semua</button>
            {[5,4,3,2,1].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${filter === f ? 'bg-or text-white' : 'text-gray-400'}`}>
                {f} <Star size={10} fill={filter === f ? "white" : "none"} />
              </button>
            ))}
          </div>
          
          <select 
            className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-or/20 w-full md:w-auto"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="newest">Terbaru</option>
            <option value="highest">Rating Tertinggi</option>
          </select>
        </div>
      </div>

      {/* REVIEW LIST */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {filteredReviews.length === 0 ? (
          <div className="py-20 text-center animate-fadeIn flex flex-col items-center">
            <div className="w-24 h-24 bg-white dark:bg-white/5 rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl opacity-50">
              <Sparkles size={40} className="text-or" />
            </div>
            <h3 className="text-xl font-syne font-black text-gray-400 uppercase tracking-widest">Belum ada ulasan untuk filter ini</h3>
            <p className="text-xs text-gray-500 mt-2 font-bold">Jadilah yang pertama memberikan penilaian!</p>
          </div>
        ) : (
          filteredReviews.map((r, i) => {
            const initial = (r.nama_user || 'P').charAt(0).toUpperCase()
            return (
              <div key={r.id || i} className="group bg-white dark:bg-[#1A1A1A] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-xl transition-all animate-fadeUp backdrop-blur-sm" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-or to-or3 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                        {r.nama_user || 'Pelanggan Setia'}
                        {r.id_order && <span className="px-2 py-0.5 bg-gn/10 text-gn text-[8px] rounded-full">Verified Order</span>}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{fmtDate(r.created_at || r.tanggal)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        size={14} 
                        fill={star <= r.rating ? "var(--or)" : "none"} 
                        className={`${star <= r.rating ? "text-or drop-shadow-[0_0_4px_rgba(255,165,0,0.4)]" : "text-gray-100 dark:text-white/5"}`} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4 relative">
                  <MessageCircle size={18} className="text-or mt-1 shrink-0 opacity-50" />
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed italic font-medium">
                    "{r.komentar || 'Tidak ada komentar.'}"
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
