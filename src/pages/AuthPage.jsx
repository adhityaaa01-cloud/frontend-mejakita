import { useState, useEffect } from 'react'
import { API, saveUser } from '../utils/auth'
import { 
  AlertTriangle, 
  CheckCircle, 
  UtensilsCrossed, 
  LogIn, 
  UserPlus, 
  ShieldCheck, 
  Loader2, 
  Key, 
  NotebookPen,
  Mail,
  Lock,
  User,
  ArrowRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Zap,
  Award,
  Ticket,
  CreditCard,
  LockKeyhole,
  Check
} from 'lucide-react'

export default function AuthPage({ mode, setPage, onLogin }) {
  const [isLogin,  setIsLogin]  = useState(mode === 'login')
  const [form,     setForm]     = useState({ nama: '', email: '', password: '', confirmPassword: '' })
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState({ text: '', ok: false })
  const [showPass, setShowPass] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const getPassStrength = () => {
    if (!form.password) return 0
    let s = 0
    if (form.password.length >= 6) s++
    if (/[A-Z]/.test(form.password)) s++
    if (/[0-9]/.test(form.password)) s++
    if (/[^A-Za-z0-9]/.test(form.password)) s++
    return s
  }

  const submit = async () => {
    if (!isLogin && form.password !== form.confirmPassword) {
      setMsg({ text: 'Password tidak cocok!', ok: false })
      return
    }

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
      } else {
        setMsg({ text: 'Registrasi berhasil! Silakan login.', ok: true })
        setIsLogin(true)
        setForm({ ...form, password: '', confirmPassword: '' })
      }
    } catch (e) {
      if (e.message.includes('Failed to fetch')) {
        if (isLogin) {
          const mockId = Math.abs(Array.from(form.email).reduce((acc, char) => acc + char.charCodeAt(0), 0) + 1000)
          const mockName = form.email.split('@')[0]
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

  const features = [
    { icon: <Zap size={20} />, text: 'Pemesanan Cepat' },
    { icon: <Award size={20} />, text: 'Loyalty Stamp Digital' },
    { icon: <Ticket size={20} />, text: 'Promo & Voucher' },
    { icon: <CreditCard size={20} />, text: 'Pembayaran Mudah' },
  ]

  return (
    <div className={`auth-pg min-h-screen w-full flex items-center justify-center p-0 md:p-6 lg:p-12 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{
      background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C00 50%, #FFB347 100%)'
    }}>
      {/* Background Blobs */}
      <div className="fixed top-[10%] left-[10%] w-96 h-96 bg-white/20 rounded-full blur-[120px] animate-floatSlow pointer-events-none"></div>
      <div className="fixed bottom-[10%] right-[10%] w-[30rem] h-[30rem] bg-premium-orangePale/30 rounded-full blur-[150px] animate-floatSlow pointer-events-none" style={{ animationDelay: '-4s' }}></div>

      <div className="w-full max-w-6xl flex bg-white/95 backdrop-blur-2xl md:rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.25)] overflow-hidden border border-white/40 relative z-10 animate-zoomIn">
        
        {/* LEFT SECTION (Branding & Features) - Hidden on mobile */}
        <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-premium-orange to-premium-orangeLight p-16 relative overflow-hidden">
          {/* Decorative shapes for left section */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-black/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                <UtensilsCrossed size={32} className="text-white" />
              </div>
              <span className="text-4xl font-black tracking-tighter text-white">MejaKita</span>
            </div>

            <h1 className="text-5xl xl:text-6xl font-black font-syne leading-[1.1] mb-8 text-white">
              Nikmati Hidangan<br />
              <span className="text-premium-cream">Tanpa Menunggu</span>
            </h1>
            
            <p className="text-xl text-white/90 max-w-md mb-12 leading-relaxed font-medium">
              Sistem manajemen meja dan pemesanan digital paling modern untuk kenyamanan bersantap Anda.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              {features.map((f, i) => (
                <div key={i} className="flex flex-col gap-3 p-6 bg-white/10 backdrop-blur-md rounded-[24px] border border-white/20 hover:bg-white/15 transition-all group">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-premium-cream group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <span className="font-bold text-sm tracking-wide text-white">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION (Auth Form) */}
        <div className="w-full lg:w-1/2 flex flex-col p-8 md:p-12 lg:p-16 overflow-y-auto max-h-[90vh] md:max-h-none">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-premium-orange rounded-xl flex items-center justify-center text-white shadow-lg">
              <UtensilsCrossed size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-premium-gray900">MejaKita</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black font-syne text-premium-gray900 tracking-tight">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
            </h2>
            <p className="text-premium-gray700 mt-3 font-medium">
              {isLogin ? 'Silakan masuk untuk melanjutkan pesanan Anda.' : 'Bergabunglah untuk menikmati semua fitur eksklusif kami.'}
            </p>
          </div>

          {/* Segmented Control */}
          <div className="flex p-1.5 bg-premium-gray50 mb-10 rounded-[20px] border border-premium-gray200/50">
            <button 
              className={`flex-1 py-3.5 text-sm font-black rounded-[16px] transition-all duration-300 ${isLogin ? 'bg-white text-premium-orange shadow-md' : 'text-premium-gray700 hover:text-premium-orange'}`}
              onClick={() => { setIsLogin(true); setMsg({ text: '', ok: false }) }}
            >
              Masuk
            </button>
            <button 
              className={`flex-1 py-3.5 text-sm font-black rounded-[16px] transition-all duration-300 ${!isLogin ? 'bg-white text-premium-orange shadow-md' : 'text-premium-gray700 hover:text-premium-orange'}`}
              onClick={() => { setIsLogin(false); setMsg({ text: '', ok: false }) }}
            >
              Daftar
            </button>
          </div>

          {msg.text && (
            <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 animate-fadeUp mb-8 ${msg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {msg.ok ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              <span className="font-bold text-sm leading-tight">{msg.text}</span>
            </div>
          )}

          <div className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-premium-gray700/50 ml-1">Nama Lengkap</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-premium-gray700/30 group-focus-within:text-premium-orange transition-colors">
                    <User size={20} />
                  </span>
                  <input 
                    className="w-full h-[60px] pl-14 pr-6 bg-premium-gray50 border-2 border-transparent focus:border-premium-orange/20 focus:bg-white rounded-[18px] font-bold text-premium-gray900 outline-none transition-all placeholder:text-premium-gray700/30" 
                    name="nama" 
                    placeholder="Contoh: John Doe" 
                    value={form.nama} 
                    onChange={handle} 
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-premium-gray700/50 ml-1">Alamat Email</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-premium-gray700/30 group-focus-within:text-premium-orange transition-colors">
                  <Mail size={20} />
                </span>
                <input 
                  className="w-full h-[60px] pl-14 pr-6 bg-premium-gray50 border-2 border-transparent focus:border-premium-orange/20 focus:bg-white rounded-[18px] font-bold text-premium-gray900 outline-none transition-all placeholder:text-premium-gray700/30" 
                  name="email" 
                  type="email" 
                  placeholder="email@domain.com" 
                  value={form.email} 
                  onChange={handle} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-premium-gray700/50">Kata Sandi</label>
                {isLogin && (
                  <button className="text-[11px] font-black uppercase tracking-[0.1em] text-premium-orange hover:underline decoration-2 underline-offset-4">Lupa?</button>
                )}
              </div>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-premium-gray700/30 group-focus-within:text-premium-orange transition-colors">
                  <Lock size={20} />
                </span>
                <input 
                  className="w-full h-[60px] pl-14 pr-14 bg-premium-gray50 border-2 border-transparent focus:border-premium-orange/20 focus:bg-white rounded-[18px] font-bold text-premium-gray900 outline-none transition-all placeholder:text-premium-gray700/30" 
                  name="password" 
                  type={showPass ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={form.password} 
                  onChange={handle} 
                />
                <button 
                  type="button"
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-premium-gray700/30 hover:text-premium-orange transition-colors focus:outline-none"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2 animate-fadeUp">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-premium-gray700/50 ml-1">Konfirmasi Sandi</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-premium-gray700/30 group-focus-within:text-premium-orange transition-colors">
                    <ShieldCheck size={20} />
                  </span>
                  <input 
                    className={`w-full h-[60px] pl-14 pr-6 bg-premium-gray50 border-2 rounded-[18px] font-bold text-premium-gray900 outline-none transition-all ${form.confirmPassword ? (form.password === form.confirmPassword ? 'border-green-100 focus:border-green-400' : 'border-red-100 focus:border-red-400') : 'border-transparent focus:border-premium-orange/20'}`} 
                    name="confirmPassword" 
                    type="password" 
                    placeholder="Ulangi kata sandi" 
                    value={form.confirmPassword} 
                    onChange={handle} 
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            className="group relative w-full h-[64px] bg-gradient-to-r from-premium-orange to-premium-orangeLight text-white rounded-[20px] font-black text-sm tracking-widest shadow-xl shadow-premium-orange/20 hover:shadow-2xl hover:shadow-premium-orange/30 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all mt-10 disabled:opacity-50 disabled:translate-y-0" 
            onClick={submit} 
            disabled={loading}
          >
            <div className="flex items-center justify-center gap-3">
              {loading ? (
                <><Loader2 size={24} className="animate-spin" /> Sedang Memproses...</>
              ) : (
                <>
                  {isLogin ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG'}
                  <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </div>
          </button>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-premium-gray200"></div></div>
            <div className="relative flex justify-center text-[11px] uppercase font-black tracking-[0.3em] text-premium-gray700/30">
              <span className="bg-white px-6">Atau</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <button className="flex items-center justify-center gap-3 h-[56px] bg-white border-2 border-premium-gray100 rounded-[18px] font-bold text-sm text-premium-gray900 hover:bg-premium-gray50 hover:border-premium-gray200 transition-all active:scale-95">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Google
            </button>
            <button className="flex items-center justify-center gap-3 h-[56px] bg-white border-2 border-premium-gray100 rounded-[18px] font-bold text-sm text-premium-gray900 hover:bg-premium-gray50 hover:border-premium-gray200 transition-all active:scale-95">
              <img src="https://www.svgrepo.com/show/442921/apple-logo.svg" className="w-5 h-5" alt="Apple" />
              Apple ID
            </button>
          </div>

          <div className="mt-auto pt-8 flex flex-col items-center gap-6">
            <button 
              className="text-sm font-black text-premium-gray700/50 hover:text-premium-orange transition-colors flex items-center gap-2 group" 
              onClick={() => setPage('home')}
            >
              <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              Lanjut Sebagai Tamu
            </button>
            
            <div className="flex justify-center gap-6 text-[10px] font-black text-premium-gray700/20 tracking-widest uppercase">
              <a href="#" className="hover:text-premium-orange transition-colors">Privasi</a>
              <span>•</span>
              <a href="#" className="hover:text-premium-orange transition-colors">Ketentuan</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

