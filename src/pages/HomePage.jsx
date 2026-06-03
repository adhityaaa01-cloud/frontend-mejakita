import { useState, useEffect, useRef } from 'react'
import SkelCard from '../components/SkelCard'
import MenuCard from '../components/MenuCard'
import Marquee  from '../components/Marquee'
import { API, isIn, getName, getPoin } from '../utils/auth'
import { Star, Quote, ChevronRight, User, Rocket, Zap, Award, Gift, CupSoda, Flame, Sparkles, ShoppingBag } from 'lucide-react'

const BANNERS = [
  { src: "/assets/promo-sale.png", alt: "Promo Sale" },
  { src: "/assets/promo-kebab-turki.png", alt: "Menu Baru Kebab Turki" },
  { src: "/assets/paket-keluarga.png", alt: "Paket Keluarga" },
  { src: "/assets/promo-stamp-diskon.png", alt: "Promo Stamp Diskon" },
]

export default function HomePage({ setPage, menus }) {
  const [activeBanner, setActiveBanner] = useState(0)
  const [activeReview, setActiveReview] = useState(0)
  const [reviews, setReviews] = useState([])
  const [isHoverBanner, setIsHoverBanner] = useState(false)
  const poin = getPoin()
  const MAX  = 5
  const recs = menus.filter((m) => m.kategori === 'makanan').slice(0, 4)

  // Fetch Reviews
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch(`${API}/reviews`)
        const d = await r.json()
        if (d.success) setReviews(d.data.slice(0, 5))
      } catch (e) {}
    })()
  }, [])

  // Auto-slide Banners with Hover Pause
  useEffect(() => {
    if (isHoverBanner) return
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % BANNERS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isHoverBanner])

  // Auto-slide Reviews
  useEffect(() => {
    if (reviews.length === 0) return
    const timer = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % reviews.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [reviews])

  return (
    <div className="page overflow-x-hidden">
      {/* HERO */}
      <div className="hero relative overflow-hidden bg-black min-h-[420px] md:min-h-[500px] flex items-center rounded-b-[40px] shadow-2xl">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <source src="/assets/bg.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[1]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-[1]"></div>

        <div className="hero-in relative z-[3] w-full px-6 md:px-12" style={{ animation: 'fadeUp .8s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          <div className="hero-gr flex items-center gap-2 mb-4">
            <span className="w-8 h-[2px] bg-or rounded-full"></span>
            <span className="text-white/90 font-bold tracking-widest uppercase text-[10px] md:text-xs">
              {isIn() ? `Halo, ${getName()?.split(' ')[0]}!` : 'Selamat datang di MejaKita!'}
            </span>
          </div>
          <div className="hero-ttl text-white text-shadow-lg leading-[1.1] mb-6 drop-shadow-2xl">
            Makan Enak,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-or to-yw">Pesan Sendiri.</span>
          </div>
          <div className="hero-sub text-white/80 max-w-md mb-8 text-lg font-medium drop-shadow-md">
            Nikmati pengalaman kuliner modern dengan sistem pemesanan mandiri yang cepat dan aman.
          </div>
          <div className="flex flex-wrap gap-4 mb-8">
            <button 
              onClick={() => setPage('menu')}
              className="px-8 py-4 bg-or hover:bg-or3 text-white font-extrabold rounded-2xl transition-all hover:scale-105 hover:shadow-glow-or active:scale-95 flex items-center gap-2 group"
            >
              <ShoppingBag size={20} /> Pesan Sekarang
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <div className="flex -space-x-3 items-center">
              {[1,2,3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white/20 bg-gray-800 flex items-center justify-center text-xs overflow-hidden">
                   <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                </div>
              ))}
              <span className="ml-5 text-white/70 text-xs font-bold">Bergabung dengan pelanggan lainnya</span>
            </div>
          </div>
          <div className="hero-pills flex-wrap hidden md:flex">
            <span className="hpill bg-white/10 backdrop-blur-md border-white/20 flex items-center gap-2">
              <Sparkles size={12} className="text-or" /> {menus.length}+ Menu Pilihan
            </span>
            <span className="hpill bg-white/10 backdrop-blur-md border-white/20 flex items-center gap-2">
              <Zap size={12} className="text-or" /> Pelayanan Cepat
            </span>
            <span className="hpill bg-white/10 backdrop-blur-md border-white/20 flex items-center gap-2">
              <Award size={12} className="text-or" /> Kualitas Premium
            </span>
          </div>
        </div>
      </div>

      <Marquee />

      {/* LOYALTY */}
      {isIn() && (
        <div className="lc" style={{ marginTop: 20, animation: 'fadeUp .5s .15s ease both' }}>
          <div className="lc-in">
            <div className="lc-top">
              <div className="lc-ttl flex items-center gap-2">
                <Award size={18} className="text-or" /> Loyalty Stamp Card
              </div>
              <div className="lc-bk">{poin}/{MAX} Stamp</div>
            </div>
            <div className="lc-sub">
              {poin >= MAX
                ? 'Diskon 50% tersedia untuk pesanan berikutnya!'
                : `Kumpulkan ${MAX - poin} stamp lagi untuk mendapatkan diskon 50%!`}
            </div>
            <div className="lc-stamps">
              {Array.from({ length: MAX }).map((_, i) => (
                <div key={i} className={`stamp ${i < poin ? 'on' : 'off'} flex items-center justify-center`}>
                  {i < poin ? <CupSoda size={16} /> : ''}
                </div>
              ))}
            </div>
            <div className="lc-bar">
              <div className="lc-fill" style={{ width: `${Math.min((poin / MAX) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM CINEMATIC BANNER SLIDER */}
      <div className="sec mt-12 mb-16 relative" 
           onMouseEnter={() => setIsHoverBanner(true)}
           onMouseLeave={() => setIsHoverBanner(false)}
           style={{ animation: 'fadeUp .8s .2s ease both' }}>
        
        <div className="sec-hd px-6 flex justify-between items-end mb-6">
          <div>
            <div className="text-[10px] font-black text-or uppercase tracking-[0.3em] mb-1">Limited Offer</div>
            <div className="sec-ttl text-2xl flex items-center gap-2">
              <Flame size={20} className="text-or" /> Promo Spesial
            </div>
          </div>
          <div className="flex gap-2.5 mb-1.5">
            {BANNERS.map((_, i) => (
              <button 
                key={i}
                onClick={() => setActiveBanner(i)}
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  activeBanner === i 
                    ? 'bg-or w-10 shadow-[0_0_10px_rgba(255,122,0,0.5)]' 
                    : 'bg-gray-200 dark:bg-white/10 w-4 hover:bg-gray-300 dark:hover:bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] shadow-premium mx-4 bg-black">
          <div 
            className="flex transition-transform duration-900 ease-[cubic-bezier(0.2, 0.8, 0.2, 1)]"
            style={{ transform: `translateX(-${activeBanner * 100}%)` }}
          >
            {BANNERS.map((b, i) => (
              <div key={i} className="min-w-full relative overflow-hidden group">
                {/* 
                  ADAPTIVE HEIGHT CONTAINER 
                  Mobile: 180-240px | Tablet: 260-360px | Desktop: 320-480px 
                */}
                <div 
                  className="w-full h-[clamp(180px,40vw,480px)] relative cursor-pointer"
                  onClick={() => setPage('menu')}
                >
                  {/* LAYER 1: BLURRED BACKGROUND FILL (Netflix Style) */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={b.src} 
                      alt=""
                      className="w-full h-full object-cover blur-2xl scale-110 opacity-40 brightness-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 opacity-60"></div>
                  </div>

                  {/* LAYER 2: SHARP CONTAINED IMAGE (Full Visibility) */}
                  <div className="relative z-10 w-full h-full flex items-center justify-center p-4 md:p-8">
                    <img 
                      src={b.src} 
                      alt={b.alt}
                      className="max-w-full max-h-full object-contain rounded-2xl drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-1000 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>

                  {/* OPTIONAL: GLASS SHINE EFFECT */}
                  <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] transition-all duration-1000 group-hover:left-[150%]"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* OVERLAY GLOW */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]"></div>
        </div>
      </div>

      {/* RECOMMENDED */}
      <div style={{ animation: 'fadeUp .5s .25s ease both' }}>
        <div className="sec-hd" style={{ padding: '0 16px', marginBottom: 12 }}>
          <div className="sec-ttl text-2xl flex items-center gap-2">
            <Sparkles size={20} className="text-or" /> Menu Pilihan
          </div>
          <span className="sec-lnk font-bold text-or" onClick={() => setPage('menu')}>Lihat Semua →</span>
        </div>
        <div className="mgrid">
          {recs.length === 0
            ? [1, 2, 3, 4].map((i) => <SkelCard key={i} />)
            : recs.map((m, i) => (
                <div key={m.id} style={{ animation: `fadeUp .4s ${i * 0.07}s ease both` }}>
                  <MenuCard menu={m} onOpenVariant={() => setPage('menu')} />
                </div>
              ))}
        </div>
      </div>

      {/* GUEST CTA */}
      {!isIn() && (
        <div className="mx-4 my-12" style={{ animation: 'fadeUp .5s .3s ease both' }}>
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-or/10 to-transparent border border-or/20 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="text-2xl font-syne font-extrabold text-gray-900 dark:text-white mb-2">Gabung Jadi Member?</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Dapatkan 1 stamp setiap pesanan dan tukarkan dengan diskon 50%!</p>
            </div>
            <button 
              className="px-10 py-4 bg-or text-white font-black rounded-2xl shadow-glow-or hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              onClick={() => setPage('login')}
            >
              <Rocket size={20} /> Daftar Sekarang
            </button>
          </div>
        </div>
      )}

      {/* REVIEWS CAROUSEL */}
      {reviews.length > 0 && (
        <div className="sec mt-24 mb-32 relative overflow-hidden" style={{ animation: 'fadeUp .8s .4s ease both' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-or/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="sec-hd px-6 flex justify-between items-end mb-12">
            <div>
              <div className="text-[10px] font-black text-or uppercase tracking-[0.3em] mb-1">Social Proof</div>
              <div className="sec-ttl text-3xl flex items-center gap-2">
                <Quote size={24} className="text-or" /> Kata Mereka
              </div>
            </div>
            <button onClick={() => setPage('reviews')} className="flex items-center gap-2 text-xs font-black text-or uppercase tracking-widest hover:underline transition-all">
              Lihat Semua <ChevronRight size={14} />
            </button>
          </div>

          <div className="px-6">
            <div className="relative bg-white dark:bg-[#1A1A1A] rounded-[3rem] p-10 md:p-16 shadow-premium border border-gray-100 dark:border-white/5 overflow-hidden">
              <Quote className="absolute top-10 left-10 text-or/10 w-24 h-24 -scale-x-100" />
              
              <div className="relative z-10">
                <div className="flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${activeReview * 100}%)` }}>
                  {reviews.map((r, i) => (
                    <div key={i} className="min-w-full text-center">
                      <div className="flex justify-center gap-1 mb-6">
                        {[1,2,3,4,5].map(star => <Star key={star} size={20} fill={star <= r.rating ? "var(--or)" : "none"} className={star <= r.rating ? "text-or" : "text-gray-100"} />)}
                      </div>
                      <p className="text-xl md:text-2xl font-syne font-bold text-gray-800 dark:text-white mb-10 leading-relaxed italic">
                        "{r.komentar || 'Pelayanannya mantap, makanannya enak!'}"
                      </p>
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-or/10 rounded-2xl flex items-center justify-center text-or mb-4">
                          <User size={32} />
                        </div>
                        <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{r.nama_user || 'Pelanggan Setia'}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Verified Guest</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center gap-3 mt-12">
                {reviews.map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setActiveReview(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${activeReview === i ? 'bg-or w-8' : 'bg-gray-200 dark:bg-white/10 w-4'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
