import { useState, useEffect, useRef } from 'react'
import socket from './utils/socket'
import Navbar        from './components/Navbar'
import BottomNav     from './components/BottomNav'
import Footer        from './components/Footer'
import VariantModal  from './components/VariantModal'
import Toast         from './components/Toast'
import HomePage      from './pages/HomePage'
import MenuPage      from './pages/MenuPage'
import CartPage      from './pages/CartPage'
import AkunPage      from './pages/AkunPage'
import AuthPage      from './pages/AuthPage'
import AdminPage     from './pages/AdminPage'
import KasirPage     from './pages/KasirPage'
import ReviewPage    from './pages/ReviewPage'
import ReservationPage from './pages/ReservationPage'
import ProtectedAdmin from './pages/ProtectedAdmin'
import { 
  Home, UtensilsCrossed, ShoppingBag, Star, CalendarDays, User, 
  LayoutDashboard, DollarSign, Moon, Sun 
} from 'lucide-react'
import { API, getActiveSession, KEYS, clearUser, validateStorage, COMPLETED_STATUS, getScopedKey, USER_KEYS, getUID, saveOrderToLocal } from './utils/auth'

export default function App() {
  // ── HYDRATION & INITIAL STATE ──
  const [page,        setPage]        = useState(() => localStorage.getItem(KEYS.LAST_PAGE) || 'home')
  const [menus,       setMenus]       = useState([])
  const [user,        setUser]        = useState(() => getActiveSession())
  const [cart,        setCart]        = useState(() => {
    try { return JSON.parse(localStorage.getItem(getScopedKey(USER_KEYS.CART)) || '[]') } catch(e) { return [] }
  })
  const [tableNo,     setTableNo]     = useState(() => localStorage.getItem(KEYS.TABLE) || '')
  const [activeOrder, setActiveOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(getScopedKey(USER_KEYS.ACTIVE_ORDER)) || 'null') } catch(e) { return null }
  })
  const [loading,     setLoading]     = useState(true)
  const [toast,       setToast]       = useState({ msg: '', type: '' })
  const [variantMenu, setVariantMenu] = useState(null)
  const [isDark,      setIsDark]      = useState(() => localStorage.getItem(KEYS.THEME) === 'dark')

  const isHydrated = useRef(false)

  // Role Checks (Dynamic from state)
  const isAdmin = user?.role === 'admin'
  const isKasir = user?.role === 'kasir' || isAdmin
  const isDapur = user?.role === 'dapur' || isAdmin

  // Initial Validation
  useEffect(() => {
    validateStorage()
    isHydrated.current = true
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem(KEYS.THEME, isDark ? 'dark' : 'light')
  }, [isDark])

  // ── ROBUST PERSISTENCE SYNC ──
  useEffect(() => {
    const syncFromStorage = () => {
      const currentSession = getActiveSession()
      if (JSON.stringify(currentSession) !== JSON.stringify(user)) {
        setUser(currentSession)
      }

      const uid = getUID()
      const cartKey = `mejakita_cart_${uid}`
      const activeKey = `mejakita_active_order_${uid}`
      
      const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]')
      const savedActive = JSON.parse(localStorage.getItem(activeKey) || 'null')
      
      if (JSON.stringify(savedCart) !== JSON.stringify(cart)) {
        setCart(savedCart)
      }
      if (JSON.stringify(savedActive) !== JSON.stringify(activeOrder)) {
        setActiveOrder(savedActive)
      }
    }

    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [cart, activeOrder, user])

  useEffect(() => {
    if (!isHydrated.current) return
    localStorage.setItem(KEYS.LAST_PAGE, page)
  }, [page])

  useEffect(() => {
    if (!isHydrated.current) return
    localStorage.setItem(getScopedKey(USER_KEYS.CART), JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (!isHydrated.current) return
    if (tableNo !== null && tableNo !== '') localStorage.setItem(KEYS.TABLE, tableNo)
  }, [tableNo])

  useEffect(() => {
    if (!isHydrated.current) return
    const key = getScopedKey(USER_KEYS.ACTIVE_ORDER)
    if (activeOrder) {
      localStorage.setItem(key, JSON.stringify(activeOrder))
    } else {
      localStorage.removeItem(key)
    }
  }, [activeOrder])

  const toggleTheme = () => setIsDark(!isDark)

  const showToast = (msg, type = '') => setToast({ msg, type })

  // Real-time Socket Synchronization (Event-Driven)
  useEffect(() => {
    if (activeOrder?.id_order || activeOrder?.id) {
      const orderId = activeOrder.id_order || activeOrder.id
      socket.emit('join_order', orderId)
    }

    socket.on('status_updated', (data) => {
      console.log('[App] Realtime: Status Updated', data)
      const targetId = data.id_order || data.id
      if (activeOrder && String(activeOrder.id || activeOrder.id_order) === String(targetId)) {
        const updated = { 
          ...activeOrder, 
          ...data,
          status: data.status, 
        }
        setActiveOrder(updated)
        saveOrderToLocal(updated)
      }
      showToast(`Pesanan #${targetId}: ${data.status.toUpperCase()}`, 'info')
    })

    socket.on('new_order', (data) => {
      if (isAdmin || isKasir) {
        showToast(`Pesanan Baru: Meja ${data.nomor_meja}`, 'orange')
        // Senior Engineer Note: Force immediate state sync if we're on the dashboard
      }
    })

    socket.on('new_reservation', (data) => {
      if (isAdmin || isKasir) {
        showToast(`Reservasi Baru: ${data.nama_tamu}`, 'purple')
      }
    })

    return () => {
      socket.off('status_updated')
      socket.off('new_order')
      socket.off('new_reservation')
    }
  }, [isAdmin, isKasir, activeOrder])

  // Fetch menus on mount (Senior Engineer Note: No cache for freshness)
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch(`${API}/menu`, { 
          headers: authH(),
          cache: 'no-store'
        })
        const d = await r.json()
        if (d.success) setMenus(d.data)
        else throw new Error(d.message)
      } catch (e) {
        console.warn('Backend offline, using local simulation')
        const mockMenus = [
          { id: 1, nama_menu: 'Nasi Goreng Spesial', kategori: 'makanan', harga_modal: 15000, harga_jual: 25000, foto_menu: 'nasi-goreng.jpg', deskripsi: 'Nasi goreng dengan telur, ayam, dan kerupuk.' },
          { id: 2, nama_menu: 'Es Kopi Susu Gula Aren', kategori: 'minuman', harga_modal: 8000, harga_jual: 18000, foto_menu: 'es-kopi-susu.jpg', deskripsi: 'Perpaduan kopi espresso, susu segar, dan gula aren asli.' },
          { id: 3, nama_menu: 'Ayam Pedas MejaKita', kategori: 'makanan', harga_modal: 20000, harga_jual: 35000, foto_menu: 'ayam-pedas.jpg', deskripsi: 'Ayam goreng krispi dengan sambal khas MejaKita.' },
          { id: 4, nama_menu: 'Es Teh Lemon', kategori: 'minuman', harga_modal: 3000, harga_jual: 10000, foto_menu: 'es-teh-lemon.jpg', deskripsi: 'Teh segar dengan irisan lemon asli.' },
          { id: 5, nama_menu: 'Sate Ayam Madura', kategori: 'makanan', harga_modal: 18000, harga_jual: 30000, foto_menu: 'sate-ayam.jpg', deskripsi: 'Sate ayam dengan bumbu kacang kental khas Madura.' },
          { id: 6, nama_menu: 'Matcha Latte', kategori: 'minuman', harga_modal: 10000, harga_jual: 22000, foto_menu: 'matcha-latte.jpg', deskripsi: 'Bubuk matcha premium dengan susu creamy.' },
          { id: 7, nama_menu: 'Ramen Pedas', kategori: 'makanan', harga_modal: 22000, harga_jual: 38000, foto_menu: 'ramen-pedas.jpg', deskripsi: 'Ramen kuah pedas dengan topping telur dan nori.' },
          { id: 8, nama_menu: 'Strawberry Milk', kategori: 'minuman', harga_modal: 9000, harga_jual: 20000, foto_menu: 'strawberry-milk.jpg', deskripsi: 'Susu segar dengan selai strawberry asli.' }
        ]
        setMenus(mockMenus)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ── CART ACTIONS ──
  const confirmVariant = (menu, qty, varian) => {
    setCart((prev) => {
      const existing = prev.findIndex(
        (c) => c.id === menu.id && JSON.stringify(c.varian) === JSON.stringify(varian)
      )
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty }
        showToast(`${menu.nama_menu} +${qty}`, 'orange')
        return updated
      }
      showToast(`${menu.nama_menu} (${qty}x) ditambahkan`, 'orange')
      return [...prev, { ...menu, qty, varian }]
    })
    setVariantMenu(null)
  }

  const removeItem = (idx, delta) => {
    setCart((prev) => {
      if (delta === -999) return prev.filter((_, i) => i !== idx)
      const updated = [...prev]
      updated[idx] = { ...updated[idx], qty: updated[idx].qty + delta }
      return updated.filter((c) => c.qty > 0)
    })
  }

  const handleLogout = () => {
    clearUser() // Removes all auth keys and triggers sync
    setUser(null)
    setPage('home')
    showToast('Logout berhasil')
    
    // Reset state to Guest scoped data
    const guestCart = JSON.parse(localStorage.getItem(`mejakita_cart_guest`) || '[]')
    const guestActive = JSON.parse(localStorage.getItem(`mejakita_active_order_guest`) || 'null')
    setCart(guestCart)
    setActiveOrder(guestActive)
  }

  const handleLogin = (loggedUser) => {
    setUser(loggedUser)
    // 1. Swapping data to the new user scope
    const userCart = JSON.parse(localStorage.getItem(`mejakita_cart_${loggedUser.id}`) || '[]')
    const userActive = JSON.parse(localStorage.getItem(`mejakita_active_order_${loggedUser.id}`) || 'null')
    
    setCart(userCart)
    
    if (userActive) {
      setActiveOrder(userActive)
      showToast('Pesanan aktif kamu dipulihkan', 'info')
    } else {
      // 2. If no scoped active order, try to recover from master orders (old logic fallback)
      const orderKey = `mejakita_orders_${loggedUser.id}`
      const recovered = JSON.parse(localStorage.getItem(orderKey) || '[]')
        .find(o => (String(o.userId) === String(loggedUser.id) || String(o.id_user) === String(loggedUser.id)) && !COMPLETED_STATUS.includes((o.status || '').toLowerCase()))
      
      if (recovered) {
        setActiveOrder(recovered)
        showToast('Pesanan aktif kamu berhasil dipulihkan', 'info')
      } else {
        setActiveOrder(null)
      }
    }
    
    setPage('home')
  }

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const noNav     = ['login', 'register']
  const showNav   = !noNav.includes(page)

  const SIDEBAR_TABS = [
    { id: 'home',  label: 'Beranda',   ico: Home },
    { id: 'menu',  label: 'Menu',      ico: UtensilsCrossed },
    { id: 'cart',  label: 'Keranjang', ico: ShoppingBag },
    { id: 'reviews', label: 'Review',   ico: Star },
    { id: 'reservasi', label: 'Reservasi', ico: CalendarDays },
    { id: 'akun',  label: 'Akun',      ico: User },
  ]

  return (
    <div id="root" className={`min-h-screen w-full ${showNav ? 'has-nav' : ''}`}>
      {showNav && (
        <div className="md:ml-64 transition-all duration-300">
          <Navbar setPage={setPage} onLogout={handleLogout} user={user} />
        </div>
      )}

      <div className={showNav ? "flex flex-1" : ""}>
        {/* Sidebar — Fixed on desktop, hidden on mobile */}
        {showNav && (
          <nav 
            id="sidebar" 
            className="fixed left-0 top-0 h-screen w-64 z-50 bg-white dark:bg-[#121212] border-r border-gray-100 dark:border-white/5 shadow-2xl flex flex-col shrink-0 md:flex hidden transition-all duration-300"
          >
            <div className="p-8 mb-2">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPage('home')}>
                <div className="w-12 h-12 bg-gradient-to-br from-or to-or3 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                  <UtensilsCrossed size={24} />
                </div>
                <div>
                  <div className="font-syne font-extrabold text-xl text-or leading-tight">MejaKita</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em]">Premium Dining</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
              <div className="snav-section">Utama</div>
              {SIDEBAR_TABS.map((t) => (
                <div
                  key={t.id}
                  className={`snav-item ${page === t.id ? 'on shadow-glow-or' : ''}`}
                  onClick={() => setPage(t.id)}
                >
                  <span className="snav-ico"><t.ico size={18} /></span>
                  <span className="font-bold">{t.label}</span>
                  {t.id === 'cart' && cartCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                      {cartCount}
                    </span>
                  )}
                </div>
              ))}

              {isDapur && (
                <>
                  <div className="snav-divider my-6" />
                  <div className="snav-section">Dashboard</div>
                  <div
                    className={`snav-item ${page === 'admin' ? 'on shadow-glow-or' : ''}`}
                    onClick={() => setPage('admin')}
                  >
                    <span className="snav-ico"><LayoutDashboard size={18} /></span>
                    <span className="font-bold">Dapur Admin</span>
                  </div>
                </>
              )}

              {isKasir && (
                <div
                  className={`snav-item ${page === 'kasir' ? 'on shadow-glow-or' : ''}`}
                  onClick={() => setPage('kasir')}
                >
                  <span className="snav-ico"><DollarSign size={18} /></span>
                  <span className="font-bold">Kasir</span>
                </div>
              )}
              </div>
            <div className="p-6 mt-auto border-t border-gray-50 dark:border-white/5 space-y-4">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg flex items-center">{isDark ? <Moon size={18} /> : <Sun size={18} />}</span>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Mode {isDark ? 'Gelap' : 'Terang'}</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${isDark ? 'bg-or' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isDark ? 'left-6' : 'left-1'}`} />
                </div>
              </button>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-or/10 dark:to-transparent border border-orange-100/50 dark:border-or/20">
                 <div className="text-[9px] font-black text-or uppercase tracking-widest mb-1.5 opacity-70">Sistem Status</div>
                 <div className="flex items-center gap-2 text-[11px] font-bold text-orange-900 dark:text-orange-200">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    Server Online
                 </div>
              </div>

              <div className="text-[10px] text-center text-gray-400 dark:text-gray-600 font-medium">
                MejaKita v2.0 Premium<br />
                © 2025 Professional Edition
              </div>
            </div>
          </nav>
        )}

        <main className={`flex-1 transition-all duration-300 ${showNav ? 'md:ml-64' : ''}`}>
          {page === 'home'     && <HomePage   setPage={setPage} menus={menus} />}
          {page === 'menu'     && <MenuPage   menus={menus} loading={loading} cart={cart} onOpenVariant={setVariantMenu} setPage={setPage} />}
          {page === 'cart'     && <CartPage   cart={cart} onRemoveItem={removeItem} setPage={setPage} showToast={showToast} tableNo={tableNo} setTableNo={setTableNo} activeOrder={activeOrder} setActiveOrder={setActiveOrder} setCart={setCart} />}
          {page === 'reviews'  && <ReviewPage showToast={showToast} />}
          {page === 'reservasi' && <ReservationPage showToast={showToast} />}
          {page === 'akun'     && <AkunPage   setPage={setPage} showToast={showToast} onLogout={handleLogout} />}
          {page === 'kasir'    && <KasirPage  showToast={showToast} activeOrder={activeOrder} setActiveOrder={setActiveOrder} />}

          {(page === 'login' || page === 'register') && (
            <AuthPage mode={page} setPage={setPage} onLogin={handleLogin} />
          )}
          {page === 'admin' && (
            <ProtectedAdmin setPage={setPage} user={user}>
              <AdminPage setPage={setPage} showToast={showToast} activeOrder={activeOrder} setActiveOrder={setActiveOrder} />
            </ProtectedAdmin>
          )}        </main>
      </div>

      {showNav && page !== 'admin' && (
        <div className="md:ml-64 transition-all duration-300">
          <Footer setPage={setPage} />
        </div>
      )}

      {showNav && <BottomNav page={page} setPage={setPage} cartCount={cartCount} />}

      {variantMenu && (
        <VariantModal
          menu={variantMenu}
          onConfirm={confirmVariant}
          onClose={() => setVariantMenu(null)}
        />
      )}

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: '' })} />
    </div>
  )
}
