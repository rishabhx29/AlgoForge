/**
 * PageSkeleton — lightweight Suspense fallback shown while lazy route chunks load.
 * Uses the .skeleton class defined in index.css (flat opacity pulse, not a
 * moving gradient — cheaper and less decorative).
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#19191b] px-4 py-8 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Simulated hero / header area */}
        <div className="space-y-4">
          <div className="skeleton h-8 w-2/3 rounded-[4px]" />
          <div className="skeleton h-4 w-1/2 rounded-[4px]" />
          <div className="skeleton h-4 w-2/5 rounded-[4px]" />
        </div>

        {/* Simulated card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton rounded-[6px] h-40"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>

        {/* Simulated text content */}
        <div className="space-y-3 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`skeleton h-3.5 rounded-[4px] ${i === 3 ? 'w-3/5' : 'w-full'}`}
              style={{ animationDelay: `${i * 0.06}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Minimal inline spinner for auth-gated route placeholders */
export function InlineSpinner() {
  return (
    <div
      className="min-h-screen bg-[#19191b] flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="w-8 h-8 border-2 border-[rgba(241,238,234,0.2)] border-t-[#f0997d] rounded-full animate-spin" />
    </div>
  );
}
