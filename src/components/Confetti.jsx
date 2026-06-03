import { Star, Award, Gift, Sparkles, Heart } from 'lucide-react'

export default function Confetti() {
  const icons = [Star, Award, Gift, Sparkles, Heart]
  const colors = ['#FF7A00', '#FFD54F', '#4CAF50', '#2196F3', '#E91E63']

  return (
    <div style={{ pointerEvents: 'none' }}>
      {Array.from({ length: 24 }).map((_, i) => {
        const Icon = icons[Math.floor(Math.random() * icons.length)]
        const color = colors[Math.floor(Math.random() * colors.length)]
        return (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${5 + Math.random() * 90}%`,
              top: `${Math.random() * 40}%`,
              animationDelay: `${Math.random() * 0.8}s`,
              animationDuration: `${1 + Math.random() * 1.5}s`,
              color: color
            }}
          >
            <Icon size={16 + Math.random() * 12} fill={Math.random() > 0.5 ? 'currentColor' : 'none'} />
          </div>
        )
      })}
    </div>
  )
}
