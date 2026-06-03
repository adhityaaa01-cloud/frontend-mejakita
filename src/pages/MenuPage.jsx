import { useState } from 'react'
import MenuCard from '../components/MenuCard'
import SkelCard from '../components/SkelCard'
import { Search, Filter, ShoppingBag } from 'lucide-react'

export default function MenuPage({ menus, loading, cart, onOpenVariant, setPage }) {
  const [tab,  setTab]  = useState('semua')
  const [srch, setSrch] = useState('')

  const tabs = [
    { id: 'semua',   l: '🍴 Semua'   },
    { id: 'makanan', l: '🍽️ Makanan' },
    { id: 'minuman', l: '🥤 Minuman' },
  ]

  const filtered = (menus || []).filter(
    (m) =>
      (tab === 'semua' || (m.kategori || '').toLowerCase() === tab.toLowerCase()) &&
      (m.nama_menu || '').toLowerCase().includes(srch.toLowerCase())
  )

  const cartTotal = cart.reduce((s, c) => s + (c.harga_jual * c.qty), 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  return (
    <div className="page pb-32">
      {/* PAGE HEADER */}
      <div className="bg-white dark:bg-[#1A1A1A] px-6 py-12 md:px-12 md:py-16 transition-colors duration-300">
        <div className="max-w-4xl">
          <div className="text-or font-black uppercase tracking-[0.3em] text-[10px] mb-2">Our Collection</div>
          <h1 className="text-4xl md:text-5xl font-syne font-black text-gray-900 dark:text-white mb-4">Menu Pilihan 🍴</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-xl">
            Sajian kuliner terbaik dengan bahan-bahan pilihan yang segar dan berkualitas tinggi.
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="sticky top-0 z-40 bg-bg/80 dark:bg-bg/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 py-6 md:px-12 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between max-w-[1400px] mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 p-1.5 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button 
                key={t.id} 
                className={`flex-1 md:flex-none whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  tab === t.id 
                    ? 'bg-or text-white shadow-glow-or' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-or transition-colors" size={18} />
            <input
              className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl outline-none focus:border-or focus:shadow-glow-or transition-all text-sm font-medium"
              placeholder="Cari rasa favoritmu..."
              value={srch}
              onChange={(e) => setSrch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* MENU GRID */}
      <div className="px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-or rounded-full"></div>
            <h2 className="text-xl font-syne font-bold text-gray-900 dark:text-white capitalize">
              {tab} ({filtered.length})
            </h2>
          </div>
          <button className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-or transition-colors">
            <Filter size={14} />
            Advanced Filter
          </button>
        </div>

        {loading ? (
          <div className="mgrid">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkelCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fadeIn">
            <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-4xl mb-6">🔍</div>
            <h3 className="text-xl font-syne font-bold text-gray-900 dark:text-white mb-2">Menu Tidak Ditemukan</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Coba kata kunci lain atau reset filter.</p>
          </div>
        ) : (
          <div className="mgrid pb-12">
            {filtered.map((m, i) => (
              <div key={m.id} style={{ animation: `fadeUp .6s ${i * 0.05}s cubic-bezier(0.2, 0.8, 0.2, 1) both` }}>
                <MenuCard menu={m} cart={cart} onOpenVariant={onOpenVariant} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STICKY CART MOBILE SUMMARY */}
      {cartCount > 0 && (
        <div className="fixed bottom-28 left-6 right-6 z-50 md:hidden animate-slideUp">
          <button 
            onClick={() => setPage('cart')}
            className="w-full bg-or dark:bg-or text-white p-4 rounded-[1.5rem] shadow-2xl shadow-orange-500/40 flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center relative">
                <ShoppingBag size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-or text-[9px] font-black rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Lihat Keranjang</div>
                <div className="text-sm font-black">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cartTotal)}
                </div>
              </div>
            </div>
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </button>
        </div>
      )}
    </div>
  )
}
