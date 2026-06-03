import { useEffect } from 'react'
import { CheckCircle, XCircle, ShoppingCart, Info, Award, Bell } from 'lucide-react'

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [msg, onClose])

  if (!msg) return null

  const icons = { 
    success: <CheckCircle className="text-green-500" size={18} />, 
    error: <XCircle className="text-red-500" size={18} />, 
    orange: <ShoppingCart className="text-or" size={18} />, 
    info: <Info className="text-blue-500" size={18} />, 
    gold: <Award className="text-yw2" size={18} /> 
  }

  const bgClasses = {
    success: 'border-green-100 dark:border-green-500/20',
    error: 'border-red-100 dark:border-red-500/20',
    orange: 'border-orange-100 dark:border-or/20',
    info: 'border-blue-100 dark:border-blue-500/20',
    gold: 'border-yellow-100 dark:border-yw2/20'
  }

  return (
    <div className="fixed bottom-32 md:bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-8 z-[500] animate-toastIn pointer-events-none">
      <div className={`flex items-center gap-3 px-6 py-4 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-xl border-2 ${bgClasses[type] || 'border-gray-100 dark:border-white/10'} shadow-2xl rounded-[1.5rem] min-w-[280px] max-w-[90vw]`}>
        <div className="flex-shrink-0">
          {icons[type] || <Bell className="text-or" size={18} />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
            {msg}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pointer-events-auto transition-colors"
        >
          <XCircle size={14} />
        </button>
      </div>
    </div>
  )
}
