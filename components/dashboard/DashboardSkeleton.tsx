export function DashboardSkeleton() {
  return (
    <div className="flex-1 p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-5 max-w-7xl mx-auto w-full animate-pulse">
      {/* Smart Tip Skeleton */}
      <div className="h-16 w-full rounded-2xl bg-card border border-white/5" />

      {/* Balance Card Skeleton */}
      <div className="h-48 sm:h-56 w-full rounded-2xl sm:rounded-3xl bg-card border border-white/5 p-4 sm:p-6">
        <div className="h-4 w-24 bg-white/10 rounded-md mb-4" />
        <div className="h-10 w-48 bg-white/10 rounded-lg mb-6" />
        
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="h-11 rounded-xl bg-emerald-500/10" />
          <div className="h-11 rounded-xl bg-rose-500/10" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="h-16 rounded-2xl bg-white/5" />
          <div className="h-16 rounded-2xl bg-white/5" />
          <div className="h-16 rounded-2xl bg-white/5 col-span-2 sm:col-span-1" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 h-64 rounded-2xl bg-card border border-white/5" />
        <div className="lg:col-span-3 h-64 rounded-2xl bg-card border border-white/5" />
      </div>
      
      {/* Goals Skeleton */}
      <div className="h-32 rounded-2xl bg-card border border-white/5" />
    </div>
  );
}
