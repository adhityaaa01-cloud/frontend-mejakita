// ─── CONFIG ───
export const API = 'http://localhost:3000/api'
export const CDN = 'http://localhost:3000/uploads'
export const PH  = 'https://placehold.co/200x138/FFD54F/5D4037?text=%F0%9F%8D%BD%EF%B8%8F'
export const PHS = 'https://placehold.co/58x58/FFD54F/5D4037?text=F'

// ─── STORAGE KEYS ───
export const KEYS = {
  CUSTOMER:      'mejakita_customer',
  ADMIN:         'mejakita_admin',
  CASHIER:       'mejakita_cashier',
  TABLE:         'mejakita_table',
  THEME:         'mejakita_theme',
  LAST_PAGE:     'mejakita_last_page',
  RESERVATIONS:  'mejakita_reservations',
}

// Scoped keys generator
export const getScopedKey = (base, uid = null) => {
  const targetUid = uid || getUID()
  return `mejakita_${base}_${targetUid}`
}

export const USER_KEYS = {
  CART:         'cart',
  ACTIVE_ORDER: 'active_order',
  ORDERS:       'orders',
  HISTORY:      'history',
  REVIEWS:      'reviews',
  LOYALTY:      'loyalty'
}

// ─── CONSTANTS ───
export const COMPLETED_STATUS = ["selesai", "done", "completed", "finished", "lunas", "dibatalkan", "cancelled"]

// ─── FORMATTERS ───
export const fmt     = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)
export const fmtDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch (e) { return '-' }
}

// ─── AUTH HELPERS ───

// Individual session getters
export const getCustomerSession = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.CUSTOMER) || 'null') } catch(e) { return null }
}
export const getAdminSession    = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.ADMIN)    || 'null') } catch(e) { return null }
}
export const getCashierSession  = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.CASHIER)  || 'null') } catch(e) { return null }
}

// Logic to determine "Effective Session" for UI visibility
export function getActiveSession() {
  return getAdminSession() || getCashierSession() || getCustomerSession()
}

export const getToken = () => getActiveSession()?.token || null
export const getRole  = () => getActiveSession()?.role  || null
export const getUID   = () => {
  const session = getActiveSession()
  if (!session) return null
  return session.id || session.id_user || 'guest'
}
export const getName  = () => getActiveSession()?.nama  || 'Pelanggan'

// Loyalty derived from completed orders + base loyalty
export const getPoin = () => {
  const uid = getUID()
  if (!uid) return 0
  
  try {
    const history = JSON.parse(localStorage.getItem(getScopedKey(USER_KEYS.HISTORY)) || '[]')
    const userHistory = history.filter(h => {
      const hUid = h.userId || h.id_user
      const isMatch = String(hUid) === String(uid)
      const isCompleted = COMPLETED_STATUS.includes((h.status || '').toLowerCase())
      return isMatch && isCompleted
    })
    
    const basePoin = parseInt(getActiveSession()?.poin_pesanan || '0')
    return basePoin + userHistory.length
  } catch (e) { return 0 }
}

export const isIn     = () => !!getToken()
export const isAdmin  = () => getRole() === 'admin'
export const isKasir  = () => getRole() === 'kasir' || getRole() === 'admin'
export const isDapur  = () => getRole() === 'dapur' || getRole() === 'admin'

export const authH    = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
})

// ─── ORDER PERSISTENCE HELPERS ───

export function saveOrderToLocal(orderData) {
  const currentUid = getUID()
  const currentRole = getRole()
  
  const targetUserId = orderData.userId || orderData.id_user || (currentRole !== 'admin' && currentRole !== 'kasir' ? currentUid : 'guest')
  
  const order = { 
    ...orderData, 
    userId: targetUserId,
    updatedAt: new Date().toISOString() 
  }
  
  try {
    const orderKey = getScopedKey(USER_KEYS.ORDERS, targetUserId)
    const historyKey = getScopedKey(USER_KEYS.HISTORY, targetUserId)
    const activeKey = getScopedKey(USER_KEYS.ACTIVE_ORDER, targetUserId)

    // 1. Update User-Specific Orders
    const orders = JSON.parse(localStorage.getItem(orderKey) || '[]')
    const idx = orders.findIndex(o => String(o.id || o.id_order) === String(order.id || order.id_order))
    
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], ...order }
    } else {
      orders.push(order)
    }
    localStorage.setItem(orderKey, JSON.stringify(orders))

    // 2. Sync to History if status is completed/cancelled
    const statusLow = (order.status || '').toLowerCase()
    if (COMPLETED_STATUS.includes(statusLow)) {
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
      const hIdx = history.findIndex(h => String(h.id || h.id_order) === String(order.id || order.id_order))
      
      if (hIdx >= 0) {
        history[hIdx] = { ...history[hIdx], ...order }
      } else {
        history.push(order)
      }
      localStorage.setItem(historyKey, JSON.stringify(history))
    }

    // 3. Handle Active Order Key
    // Instead of auto-removing, we keep it so the user can see the final tracking/review page.
    // App.jsx will handle removal when the user clicks 'Kembali ke Beranda'.
    const currentActive = JSON.parse(localStorage.getItem(activeKey) || 'null')
    if (currentActive && String(currentActive.id || currentActive.id_order) === String(order.id || order.id_order)) {
      localStorage.setItem(activeKey, JSON.stringify(order))
    } else if (order.userId === getUID() && !COMPLETED_STATUS.includes(statusLow)) {
      // Set as active if it's a new order for the current user
      localStorage.setItem(activeKey, JSON.stringify(order))
    }

    // 4. Auto-remove from user cart if cancelled
    if (statusLow === 'dibatalkan' || statusLow === 'cancelled') {
      localStorage.removeItem(getScopedKey(USER_KEYS.CART, targetUserId))
    }

    // 5. Force global sync for other tabs
    window.dispatchEvent(new Event('storage'))
  } catch (e) {
    console.error('Order persistence failed', e)
  }
}

export function getActiveOrderByUser(uid) {
  if (!uid) return null
  try {
    const orders = JSON.parse(localStorage.getItem(getScopedKey(USER_KEYS.ORDERS, uid)) || '[]')
    return orders.find(o => {
      const oUid = o.userId || o.id_user
      return String(oUid) === String(uid) && !COMPLETED_STATUS.includes((o.status || '').toLowerCase())
    }) || null
  } catch (e) { return null }
}

export function getHistoryByUser(uid) {
  if (!uid) return []
  try {
    // Read from both for maximum reliability
    const masterOrders = JSON.parse(localStorage.getItem(getScopedKey(USER_KEYS.ORDERS, uid)) || '[]')
    const historyOrders = JSON.parse(localStorage.getItem(getScopedKey(USER_KEYS.HISTORY, uid)) || '[]')
    
    // Combine and deduplicate
    const combined = [...historyOrders]
    masterOrders.forEach(mo => {
      if (COMPLETED_STATUS.includes((mo.status || '').toLowerCase())) {
        const exists = combined.find(c => String(c.id || c.id_order) === String(mo.id || mo.id_order))
        if (!exists) combined.push(mo)
      }
    })

    const userHistory = combined.filter(h => {
      const hUid = h.userId || h.id_user
      return String(hUid) === String(uid)
    })
    
    return userHistory
  } catch (e) { return [] }
}

export function saveUser(token, d) {
  // Clear all previous sessions first to ensure isolation
  localStorage.removeItem(KEYS.ADMIN)
  localStorage.removeItem(KEYS.CASHIER)
  localStorage.removeItem(KEYS.CUSTOMER)

  const sessionData = { token, ...d }
  if (d.role === 'admin') {
    localStorage.setItem(KEYS.ADMIN, JSON.stringify(sessionData))
  } else if (d.role === 'kasir' || d.role === 'dapur') {
    localStorage.setItem(KEYS.CASHIER, JSON.stringify(sessionData))
  } else {
    localStorage.setItem(KEYS.CUSTOMER, JSON.stringify(sessionData))
  }
  
  // Dispatch event for tab synchronization
  window.dispatchEvent(new Event('storage'))
}

export function updateActiveSession(newData) {
  const admin = getAdminSession()
  const cashier = getCashierSession()
  const customer = getCustomerSession()

  if (admin && (newData.role === 'admin' || !newData.role)) {
    localStorage.setItem(KEYS.ADMIN, JSON.stringify({ ...admin, ...newData }))
  } 
  if (cashier && (newData.role === 'kasir' || newData.role === 'dapur' || !newData.role)) {
    localStorage.setItem(KEYS.CASHIER, JSON.stringify({ ...cashier, ...newData }))
  }
  if (customer && (newData.role === 'customer' || !newData.role)) {
    localStorage.setItem(KEYS.CUSTOMER, JSON.stringify({ ...customer, ...newData }))
  }
  window.dispatchEvent(new Event('storage'))
}

export function clearUser(role = null) {
  if (role === 'admin') {
    localStorage.removeItem(KEYS.ADMIN)
  } else if (role === 'kasir' || role === 'dapur') {
    localStorage.removeItem(KEYS.CASHIER)
  } else if (role === 'customer') {
    localStorage.removeItem(KEYS.CUSTOMER)
  } else {
    // Clear EVERYTHING auth related
    localStorage.removeItem(KEYS.ADMIN)
    localStorage.removeItem(KEYS.CASHIER)
    localStorage.removeItem(KEYS.CUSTOMER)
  }
  window.dispatchEvent(new Event('storage'))
}

// ─── RECOVERY & VALIDATION ───
export function validateStorage() {
  try {
    const allKeys = [...Object.values(KEYS)]
    // Also validate common user-scoped keys for the current user if any
    if (getUID()) {
      allKeys.push(...Object.values(USER_KEYS).map(k => getScopedKey(k)))
    }

    for (const key of allKeys) {
      const item = localStorage.getItem(key)
      if (item && item !== 'undefined') {
        try { JSON.parse(item) } catch (e) { 
          console.warn(`Corrupted storage found for ${key}, clearing...`)
          localStorage.removeItem(key) 
        }
      }
    }
    return true
  } catch (e) {
    return false
  }
}

