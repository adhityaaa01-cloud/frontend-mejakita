import { CDN, PH, fmt } from '../utils/auth'
import { Plus, Heart, Star } from 'lucide-react'

export default function MenuCard({ menu, cart, onOpenVariant }) {
  const inCart   = cart?.filter((c) => c.id === menu.id) ?? []
  const totalQty = inCart.reduce((s, c) => s + c.qty, 0)
  const img      = menu.foto_menu ? `${CDN}/${menu.foto_menu}` : PH
  
  // Mock logic for favorite for demo purposes
  const isFavorite = menu.id % 3 === 0
  const isSoldOut = menu.is_available === 0 || menu.is_available === false

  return (
    <div 
      className={`group bg-white dark:bg-[#1A1A1A] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-gray-100 dark:border-white/5 cursor-pointer relative ${isSoldOut ? 'pointer-events-none' : ''}`}
      onClick={() => !isSoldOut && onOpenVariant(menu)}
    >
      {/* Favorite Badge */}
      {isFavorite && (
        <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-black/50 backdrop-blur-md p-2 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 text-red-500">
          <Heart size={16} fill="currentColor" />
        </div>
      )}

      {/* Image Section */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${isSoldOut ? 'grayscale contrast-75' : ''}`}
          src={img}
          alt={menu.nama_menu}
          onError={(e) => { e.target.src = PH }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Category Tag */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/20 dark:bg-black/30 backdrop-blur-md border border-white/30 dark:border-white/10 px-3 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
          <span>{menu.kategori === 'makanan' ? '🍽️' : '🥤'}</span>
          <span>{menu.kategori}</span>
        </div>

        {/* Sold Badge */}
        <div className="absolute bottom-4 right-4 z-10 bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest">
          {menu.total_terjual || 0} Sold
        </div>

        {/* Cart Badge */}
        {totalQty > 0 && (
          <div className="absolute top-4 right-4 z-20 bg-or text-white min-w-[28px] h-[28px] px-2 rounded-full flex items-center justify-center font-black text-xs shadow-glow-or animate-bounceIn">
            {totalQty}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-syne font-bold text-lg text-gray-900 dark:text-white line-clamp-1 group-hover:text-or transition-colors">
            {menu.nama_menu}
          </h3>
          <div className="flex items-center gap-1 text-yw2 font-bold text-xs">
            <Star size={12} fill="currentColor" />
            <span>4.8</span>
          </div>
        </div>
        
        <p className="text-gray-400 dark:text-gray-500 text-xs mb-6 line-clamp-1">
          {menu.kategori === 'makanan' ? 'Sajian lezat khas MejaKita' : 'Minuman segar pelepas dahaga'}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</span>
            <span className={`text-xl font-syne font-black ${isSoldOut ? 'text-gray-400' : 'text-or'}`}>{fmt(menu.harga_jual)}</span>
          </div>
          <button
            disabled={isSoldOut}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border border-gray-100 dark:border-white/10 active:scale-90 group/btn ${
              isSoldOut 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-50 dark:bg-white/5 hover:bg-or dark:hover:bg-or hover:text-white text-or'
            }`}
            onClick={(e) => { e.stopPropagation(); !isSoldOut && onOpenVariant(menu) }}
          >
            <Plus size={24} className={!isSoldOut ? "group-hover/btn:rotate-90 transition-transform duration-300" : ""} />
          </button>
        </div>
      </div>

      {/* Sold Out Overlay if applicable */}
      {isSoldOut && (
        <div className="absolute inset-0 z-30 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
          <div className="px-6 py-3 bg-red-600 text-white font-black text-sm rounded-2xl shadow-xl -rotate-12 border-2 border-white scale-110">
            SOLD OUT
          </div>
        </div>
      )}
    </div>
  )
}
