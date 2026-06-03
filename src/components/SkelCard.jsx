export default function SkelCard() {
  return (
    <div className="bg-white dark:bg-[#1A1A1A] rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
      {/* Image Skel */}
      <div className="skel h-48 md:h-56 w-full" />
      
      {/* Content Skel */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div className="skel h-6 w-3/4 rounded-lg" />
          <div className="skel h-4 w-1/4 rounded-lg" />
        </div>
        
        <div className="skel h-3 w-1/2 rounded-lg mb-6" />

        <div className="flex items-center justify-between">
          <div className="space-y-2 w-1/3">
            <div className="skel h-2 w-1/2 rounded-lg" />
            <div className="skel h-6 w-full rounded-lg" />
          </div>
          <div className="skel w-12 h-12 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
