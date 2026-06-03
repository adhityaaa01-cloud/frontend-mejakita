import { UtensilsCrossed } from 'lucide-react'

export default function Loader({ text = 'Memuat...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-6 animate-fadeIn">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-or/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-or rounded-full border-t-transparent animate-spin shadow-glow-or" />
        <div className="absolute inset-4 bg-gradient-to-br from-or to-or3 rounded-full animate-pulse flex items-center justify-center text-white">
          <UtensilsCrossed size={20} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="font-syne font-black text-or uppercase tracking-[0.2em] text-[10px]">{text}</span>
        <div className="flex gap-1">
          {[1,2,3].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-or rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
