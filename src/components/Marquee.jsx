import React from 'react'
import { FaWhatsapp, FaInstagram, FaYoutube } from 'react-icons/fa'
import { UtensilsCrossed, Clock, Mail, Sparkles, Flame, Zap } from 'lucide-react'

const INFO_ITEMS = [
  { ico: UtensilsCrossed, text: 'Selamat datang di MejaKita' },
  { ico: FaWhatsapp, text: 'Booking meja sekarang via WhatsApp 123456789' },
  { ico: Clock, text: 'Buka setiap hari 09.00 - 21.00 WIB' },
  { ico: FaInstagram, text: 'Follow IG @mejakita' },
  { ico: FaYoutube, text: 'YouTube: mejakita_official' },
  { ico: Mail, text: 'Email: mejakita@gmail.com' },
  { ico: Sparkles, text: 'Nikmati hidangan spesial kami hari ini' },
  { ico: Flame, text: 'Promo spesial diskon 20% setiap jam 14.00 - 17.00' },
  { ico: Zap, text: 'Reservasi cepat tanpa antre' },
]

export default function Marquee() {
  const content = (
    <div className="flex items-center gap-8 py-3">
      {INFO_ITEMS.map((item, i) => (
        <div key={i} className="flex items-center gap-3 whitespace-nowrap text-white font-medium text-sm">
          <item.ico size={16} className="shrink-0" />
          <span>{item.text}</span>
          <span className="ml-8 text-white/30">•</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-or via-or2 to-or3 shadow-md shadow-or/20 my-5 rounded-xl border border-white/10 group">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="animate-marquee">
        {content}
        {content} {/* Duplicate for seamless loop */}
      </div>
    </div>
  )
}
