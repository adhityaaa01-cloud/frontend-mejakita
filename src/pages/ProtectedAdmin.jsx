import { isIn, getRole } from '../utils/auth'

export default function ProtectedAdmin({ children, setPage, user }) {
  const role = user?.role || getRole()
  const isStaff = ['admin', 'kasir', 'dapur'].includes(role)

  if (!(user || isIn()) || !isStaff) return (
    <div
      className="page"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 24, textAlign: 'center' }}
    >
      <span style={{ fontSize: 70, marginBottom: 16, display: 'block', animation: 'bounceIn .5s ease' }}>🔒</span>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Akses Terbatas</div>
      <div style={{ fontSize: 14, color: 'var(--g500)', marginBottom: 14, lineHeight: 1.6 }}>
        Hanya <strong style={{ color: 'var(--or)' }}>admin/staf</strong> yang bisa masuk.<br />
        JWT divalidasi <code>verifyToken+isAdmin</code>.
      </div>
      <button className="btn btn-p" style={{ maxWidth: 280 }} onClick={() => setPage('login')}>
        🔑 Login Staf
      </button>
    </div>
  )
  return children
}
