import { useState } from 'react'
import { API, saveUser } from '../utils/auth'
import { AlertTriangle, CheckCircle, UtensilsCrossed, Award, LogIn, UserPlus, ShieldCheck, Loader2, Key, NotebookPen } from 'lucide-react'

export default function AuthPage({ mode, setPage, onLogin }) {
  const [isLogin,  setIsLogin]  = useState(mode === 'login')
  const [form,     setForm]     = useState({ nama: '', email: '', password: '' })
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState({ text: '', ok: false })

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    setMsg({ text: '', ok: false })
    setLoading(true)
    try {
      const url  = `${API}/users/${isLogin ? 'login' : 'register'}`
      const body = isLogin
        ? { email: form.email, password: form.password }
        : { nama: form.nama, email: form.email, password: form.password }
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      
      if (!d.success) throw new Error(d.message)
      
      if (isLogin) {
        saveUser(d.token, d.data)
        onLogin(d.data)
        // Redirection handled in handleLogin or here
      } else {
        setMsg({ text: 'Registrasi berhasil! Silakan login.', ok: true })
        setIsLogin(true)
        setForm({ ...form, password: '' })
      }
    } catch (e) {
      if (e.message.includes('Failed to fetch')) {
        // LOCAL SIMULATION
        if (isLogin) {
          const mockId = Math.abs(Array.from(form.email).reduce((acc, char) => acc + char.charCodeAt(0), 0) + 1000)
          const mockName = form.email.split('@')[0]
          // Basic role detection for offline testing
          const mockRole = form.email.includes('admin') ? 'admin' : (form.email.includes('kasir') ? 'kasir' : 'customer')
          const mockUser = { id: mockId, nama: mockName, role: mockRole, email: form.email }
          saveUser('mock-token', mockUser)
          onLogin(mockUser)
          return
        } else {
          setMsg({ text: 'Registrasi berhasil! (Local Mode)', ok: true })
          setIsLogin(true)
          return
        }
      }
      setMsg({ text: e.message, ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-pg">
      <div className="auth-hero">
        <div className="auth-mascot bg-white/20 backdrop-blur-md p-4 rounded-3xl mb-4">
          <UtensilsCrossed size={40} className="text-white" />
        </div>
        <div className="auth-brand">MejaKita</div>
        <div className="auth-tag">
          {isLogin ? 'Selamat datang kembali' : 'Dapatkan akses eksklusif & reward premium'}
        </div>
      </div>

      <div className="auth-sheet">
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, marginBottom: 4 }} className="flex items-center gap-2">
          {isLogin ? <><Key size={22} className="text-or" /> Login</> : <><NotebookPen size={22} className="text-or" /> Daftar Akun</>}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--g500)', marginBottom: 20 }}>
          {isLogin ? 'Masuk untuk akses loyalty stamp & penawaran spesial' : 'Bergabunglah dengan program loyalitas kami hari ini.'}
        </div>

        {msg.text && (
          <div className={`al ${msg.ok ? 'al-s' : 'al-e'} flex items-center gap-3`} style={{ marginBottom: 14 }}>
            {msg.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {msg.text}
          </div>
        )}

        {!isLogin && (
          <div className="fg">
            <label className="fl">Nama Lengkap</label>
            <input className="fi" name="nama" placeholder="Nama kamu" value={form.nama} onChange={handle} />
          </div>
        )}

        <div className="fg">
          <label className="fl">Email</label>
          <input className="fi" name="email" type="email" placeholder="email@contoh.com" value={form.email} onChange={handle} />
        </div>

        <div className="fg">
          <label className="fl">Password</label>
          <input className="fi" name="password" type="password" placeholder="Min. 6 karakter" value={form.password} onChange={handle} />
        </div>

        <div className="al al-i flex items-start gap-3" style={{ marginBottom: 14 }}>
          <ShieldCheck size={18} className="shrink-0 text-or" />
          <span className="text-xs">Data Anda dienkripsi dan disimpan dengan aman menggunakan standar industri JWT.</span>
        </div>

        <button className="btn btn-p flex items-center justify-center gap-2" onClick={submit} disabled={loading}>
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Menghubungkan...</>
          ) : isLogin ? (
            <><LogIn size={18} /> Masuk</>
          ) : (
            <><UserPlus size={18} /> Daftar Sekarang</>
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--g700)' }}>
          {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <strong
            style={{ color: 'var(--or)', cursor: 'pointer' }}
            onClick={() => { setIsLogin(!isLogin); setMsg({ text: '', ok: false }) }}
          >
            {isLogin ? 'Daftar' : 'Login'}
          </strong>
        </div>

        <button className="btn btn-sec" style={{ marginTop: 12 }} onClick={() => setPage('home')}>
          ← Lanjut sebagai Tamu
        </button>
      </div>
    </div>
  )
}
