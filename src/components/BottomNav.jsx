import { Home, Utensils, ShoppingCart, User } from 'lucide-react'

export default function BottomNav({ page, setPage, cartCount }) {
  const tabs = [
    { id: 'home', label: 'Home', ico: <Home size={22} /> },
    { id: 'menu', label: 'Menu', ico: <Utensils size={22} /> },
    { id: 'cart', label: 'Cart', ico: <ShoppingCart size={22} />, count: cartCount },
    { id: 'akun', label: 'Account', ico: <User size={22} /> },
  ]

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-[200] md:hidden animate-slideUp">
      <div className="bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl rounded-[2rem] px-4 py-3 flex items-center justify-between transition-colors duration-300">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setPage(t.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative px-4 py-2 rounded-2xl ${
              page === t.id 
                ? 'text-or scale-110' 
                : 'text-gray-400 dark:text-gray-600 hover:text-or'
            }`}
          >
            <div className={`relative ${page === t.id ? 'animate-pulse' : ''}`}>
              {t.ico}
              {t.count > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-black">
                  {t.count}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
            {page === t.id && (
              <div className="absolute -bottom-1 w-1 h-1 bg-or rounded-full shadow-glow-or" />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
