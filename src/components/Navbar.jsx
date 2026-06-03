import { isIn, getName, getRole } from '../utils/auth'
import { UtensilsCrossed, LayoutDashboard, DollarSign, User, LogOut } from 'lucide-react'

export default function Navbar({ setPage, onLogout, user }) {
  const role    = user?.role || getRole()
  const isAdmin = role === 'admin'
  const isStaff = role === 'kasir' || role === 'dapur'

  return (
    <div className="nav">
      <div className="brand" onClick={() => setPage('home')}>
        <div className="brand-ico flex items-center justify-center">
          <UtensilsCrossed size={20} />
        </div>
        <span className="brand-name">MejaKita</span>
      </div>
      <div className="nav-acts">
        {isAdmin && (
          <button className="nb nb-adm flex items-center gap-2" onClick={() => setPage('admin')}>
            <LayoutDashboard size={14} /> Dapur Admin
          </button>
        )}
        {isStaff && !isAdmin && (
          <button className="nb nb-adm flex items-center gap-2" style={{ background: 'var(--gn)', color: 'white' }} onClick={() => setPage('kasir')}>
            <DollarSign size={14} /> Kasir Mode
          </button>
        )}
        {user || isIn() ? (
          <button className="nb nb-ghost flex items-center gap-2" onClick={onLogout}>
            <User size={14} className="hidden md:inline" />
            {getName()?.split(' ')[0]} 
            <span className="ml-1 text-[8px] px-1.5 py-0.5 bg-or/10 text-or rounded-full border border-or/20 uppercase">
              {role || 'User'}
            </span>
            <LogOut size={12} className="ml-1 opacity-50" />
          </button>
        ) : (
          <>
            <button className="nb nb-out" onClick={() => setPage('login')}>Masuk</button>
            <button className="nb nb-fill" onClick={() => setPage('register')}>Daftar</button>
          </>
        )}
      </div>
    </div>
  )
}
