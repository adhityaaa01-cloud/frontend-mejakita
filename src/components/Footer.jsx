import React from 'react';
import { 
  Mail,
  Phone,
  MapPin,
  Clock,
  Globe,
  Heart,
  ChevronRight,
  UtensilsCrossed
} from 'lucide-react';
import { FaInstagram, FaWhatsapp, FaYoutube, FaFacebook } from 'react-icons/fa';

export default function Footer({ setPage }) {
  const quickLinks = [
    { name: 'Beranda', action: () => setPage('home') },
    { name: 'Menu', action: () => setPage('menu') },
    { name: 'Keranjang', action: () => setPage('cart') },
    { name: 'Akun Saya', action: () => setPage('akun') },
  ];

  const socialLinks = [
    { icon: FaWhatsapp, href: 'https://wa.me/628123456789' },
    { icon: FaInstagram, href: 'https://instagram.com/mejakita' },
    { icon: FaYoutube, href: 'https://youtube.com/mejakita' },
    { icon: FaFacebook, href: 'https://facebook.com/mejakita' },
  ];

  const recommendations = [
    'Nasi Goreng Spesial',
    'Ayam Bakar Madu',
    'Es Teh Lemon',
    'Kopi Susu Aren'
  ];

  return (
    <footer className="relative bg-cr2 dark:bg-[#121212] text-gray-700 dark:text-stone-300 pt-24 pb-32 md:pb-16 w-full font-dm overflow-hidden border-t border-orange-100 dark:border-white/5 transition-colors duration-300">
      {/* Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-200/20 dark:bg-orange-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-[1400px] mx-auto px-8 md:px-16 lg:px-24 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-20">
          
          {/* Column 1: Brand */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setPage('home')}>
              <div className="w-12 h-12 bg-gradient-to-br from-or to-or3 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-all duration-500">
                <UtensilsCrossed className="text-white" size={24} />
              </div>
              <span className="font-syne font-extrabold text-3xl tracking-tight text-or">
                Meja<span className="text-orange-900 dark:text-white transition-colors">Kita</span>
              </span>
            </div>
            <p className="text-gray-500 dark:text-stone-400 text-sm leading-relaxed">
              Menghadirkan kelezatan modern dengan kemudahan teknologi. Nikmati pengalaman kuliner terbaik bersama keluarga dan teman.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-or hover:bg-or hover:text-white transition-all duration-300 shadow-sm border border-orange-100 dark:border-white/10">
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-8">
            <h4 className="font-syne font-bold text-sm uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-or rounded-full shadow-[0_0_8px_rgba(255,122,0,0.5)]"></span>
              Navigasi Cepat
            </h4>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <button 
                    onClick={link.action}
                    className="text-gray-500 dark:text-stone-400 hover:text-or transition-all duration-300 text-sm flex items-center gap-2 group"
                  >
                    <ChevronRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Recommendations */}
          <div className="space-y-8">
            <h4 className="font-syne font-bold text-sm uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-or rounded-full shadow-[0_0_8px_rgba(255,122,0,0.5)]"></span>
              Rekomendasi Menu
            </h4>
            <ul className="space-y-4">
              {recommendations.map((item) => (
                <li key={item}>
                  <button 
                    onClick={() => setPage('menu')}
                    className="text-gray-500 dark:text-stone-400 hover:text-or transition-all duration-300 text-sm flex items-center gap-2 group"
                  >
                    <ChevronRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="space-y-8">
            <h4 className="font-syne font-bold text-sm uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-or rounded-full shadow-[0_0_8px_rgba(255,122,0,0.5)]"></span>
              Kontak Kami
            </h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-or shrink-0" />
                <p className="text-sm text-gray-500 dark:text-stone-400">Jl. Kuliner No. 123, Jakarta Selatan</p>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-or shrink-0" />
                <p className="text-sm text-gray-500 dark:text-stone-400">+62 21 1234 5678</p>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-or shrink-0" />
                <p className="text-sm text-gray-500 dark:text-stone-400">hello@mejakita.id</p>
              </li>
              <li className="flex items-center gap-3">
                <Clock size={18} className="text-or shrink-0" />
                <p className="text-sm text-gray-900 dark:text-white font-bold">10.00 - 22.00 WIB</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-orange-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
            <span>© 2025 MejaKita</span>
            <span className="mx-2">•</span>
            <span className="flex items-center gap-1">Made with <Heart size={12} className="text-red-500 fill-red-500" /> by Team</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-stone-500">
            <a href="#" className="hover:text-or transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-or transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
