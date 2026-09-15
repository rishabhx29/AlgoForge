import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStats } from '@/hooks/useStats';

interface CTAProps {
  onGetStarted: () => void;
}

/**
 * CTA — the closing bookend, in the same ember band as the hero.
 *
 * Corrections made here, beyond the rewrite:
 *
 * - The headline was "Ready to Start Your Journey?" — Title Case, and the
 *   single most generic closing line a product page can have.
 * - It advertised "500+ problems" while the catalogue holds a different number
 *   that this component can read for itself. **A landing page must not round a
 *   figure it has access to.** It now states the real count.
 * - The three trust pills said "Free Forever", "No Credit Card" and "Cancel
 *   Anytime". The third contradicts the first two — you cannot cancel a free
 *   plan — so it read as template copy. Two honest facts remain.
 * - The Sparkles icon was decoration standing in for a claim.
 */

export function CTA({ onGetStarted }: CTAProps) {
  const { userCount, problemCount, loaded } = useStats();

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ember-band rounded-[10px] px-6 sm:px-12 py-12 sm:py-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-[2rem] sm:text-[2.75rem] leading-[1.02] tracking-[-0.03em] mb-5 text-balance">
              Start with one problem.
            </h2>

            <p
              className="text-[1rem] leading-relaxed mb-8"
              style={{ color: 'var(--af-ember-ink)', opacity: 0.88 }}
            >
              {loaded
                ? `${problemCount} problems across every core topic, and a sheet that shows you exactly where you stand.`
                : 'Every core topic, and a sheet that shows you exactly where you stand.'}{' '}
              No account needed to try an explainer.
            </p>

            <Button
              size="lg"
              onClick={onGetStarted}
              className="hover:opacity-90 active:scale-[0.98] px-6 py-5 text-[0.9375rem] font-bold rounded-[6px] transition-[opacity,transform] duration-[var(--af-dur-fast)] group"
              style={{ background: 'var(--af-ember-ink)', color: 'var(--af-ember-deep)' }}
            >
              Create a free account
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-[var(--af-dur-fast)]" />
            </Button>

            <div
              className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-[0.75rem]"
              style={{ color: 'var(--af-ember-ink)' }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--af-ember-ink)' }}
                  aria-hidden="true"
                />
                Free to use
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--af-ember-ink)' }}
                  aria-hidden="true"
                />
                No card required
              </span>
              {loaded && (
                <span className="tnum opacity-80">
                  Joined by {userCount} learners
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
