/**
 * PageSkeleton — lightweight Suspense fallback shown while lazy route chunks load.
 * Uses CSS skeleton shimmer defined in index.css (.skeleton class).
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#141414] px-4 py-8 md:px-8">
      {/* Simulated hero / header area */}
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="skeleton h-10 w-2/3 rounded-lg" />
          <div className="skeleton h-5 w-1/2 rounded-md" />
          <div className="skeleton h-5 w-2/5 rounded-md" />
        </div>

        {/* Simulated card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton rounded-xl h-40"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>

        {/* Simulated text content */}
        <div className="space-y-3 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`skeleton h-4 rounded ${i === 3 ? 'w-3/5' : 'w-full'}`}
              style={{ animationDelay: `${i * 0.06}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
