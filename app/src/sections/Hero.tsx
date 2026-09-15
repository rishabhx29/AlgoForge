import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStats } from '@/hooks/useStats';
import { PatternExplainer } from '@/components/custom/stepper';

interface HeroProps {
  onGetStarted: () => void;
}

/**
 * Hero — the front door, in the Pattern Studio language.
 *
 * What changed and why:
 *
 * - The rotating typewriter headline is gone. "Master [Algorithms|System Design|
 *   Data Structures]" is the generic landing-page move, and it made the product
 *   look like every other course site. The claim is now specific: this teaches
 *   the pattern, and it shows you the structure.
 * - The typing code window is gone. It was a "watch it load" animation that
 *   demonstrated nothing — a visitor waited three seconds to see code they
 *   could not interact with.
 * - In its place: the **real binary-search explainer**, the same component the
 *   dashboard uses. A visitor can step through an algorithm on the landing page
 *   before signing up, which demonstrates the product instead of describing it.
 * - The band is drenched ember — the same committed surface as the dashboard —
 *   and starts below the fixed nav so the nav's light text never sits on
 *   terracotta, where it would fall to roughly 3.4:1.
 */

export function Hero({ onGetStarted }: HeroProps) {
  const { userCount, problemCount, loaded } = useStats();

  return (
    <section id="home" className="pt-24 sm:pt-28">
      {/* Full-bleed band: the background spans the viewport, the content does not. */}
      <div className="ember-band">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid lg:grid-cols-[1fr_1.02fr] gap-10 lg:gap-14 items-center">

            {/* Copy */}
            <div className="text-center lg:text-left">
              <p
                className="text-[0.8125rem] mb-5"
                style={{ color: 'var(--af-ember-ink)', opacity: 0.85 }}
              >
                Data structures, algorithms and system design — on one sheet
              </p>

              <h1 className="font-display text-[2.25rem] sm:text-[3rem] lg:text-[3.5rem] leading-[0.98] tracking-[-0.03em] mb-5 text-balance">
                Learn the pattern.
                <br />
                Not just the answer.
              </h1>

              <p
                className="text-[1rem] leading-relaxed mb-8 max-w-[46ch] mx-auto lg:mx-0"
                style={{ color: 'var(--af-ember-ink)', opacity: 0.88 }}
              >
                Every topic, every problem and your exact position on a single sheet.
                Step through an algorithm before you write a line of it — so the
                structure is something you have seen, not something you memorised.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="hover:opacity-90 active:scale-[0.98] px-6 py-5 text-[0.9375rem] font-bold rounded-[6px] transition-[opacity,transform] duration-[var(--af-dur-fast)] group"
                  style={{ background: 'var(--af-ember-ink)', color: 'var(--af-ember-deep)' }}
                >
                  Start with a problem
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-[var(--af-dur-fast)]" />
                </Button>
              </div>

              {/* Figures on the band, tabular. Real counts, not round numbers.
                  A placeholder stands in until the fetch resolves — showing a
                  literal 0 would tell a visitor the catalogue is empty. */}
              <div
                className="flex flex-wrap items-center justify-center lg:justify-start gap-x-10 gap-y-4 mt-10"
                style={{ color: 'var(--af-ember-ink)' }}
              >
                <div>
                  <div className="text-[1.375rem] font-medium tnum leading-none mb-1">
                    {loaded ? problemCount : '—'}
                  </div>
                  <div className="text-[0.75rem] opacity-80">Problems</div>
                </div>
                <div>
                  <div className="text-[1.375rem] font-medium tnum leading-none mb-1">
                    {loaded ? userCount : '—'}
                  </div>
                  <div className="text-[0.75rem] opacity-80">Learners</div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[0.75rem] opacity-80">
                  <BookOpen className="w-3.5 h-3.5" />
                  Notes and progress saved as you go
                </div>
              </div>
            </div>

            {/* The product, not a picture of it. On its own dark plate so the
                explainer keeps the ground tone it was designed against. */}
            <div className="w-full max-w-[560px] mx-auto lg:mx-0 lg:max-w-none">
              <div
                className="flex items-center justify-between text-[0.75rem] font-mono mb-3"
                style={{ color: 'var(--af-ember-ink)', opacity: 0.85 }}
              >
                <span>Try it — binary search</span>
                <span>no sign-up needed</span>
              </div>

              <div
                className="rounded-[8px] p-4 sm:p-5"
                style={{ background: 'var(--af-ground)' }}
              >
                <PatternExplainer topicTitle="Searching Algorithms" className="w-full" />
              </div>

              <p
                className="text-[0.75rem] mt-3.5"
                style={{ color: 'var(--af-ember-ink)', opacity: 0.85 }}
              >
                Every figure updates as the pattern moves. The same explainer is on
                each topic once you are in.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
