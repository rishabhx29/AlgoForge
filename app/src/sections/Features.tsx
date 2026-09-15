import { useStats } from '@/hooks/useStats';
import { PatternDiagram } from '@/components/custom/PatternDiagram';

/**
 * Features — the product, shown rather than described.
 *
 * What was here: six identical icon + heading + text cards in a 3-column grid,
 * all Title Case, describing things generically ("Track your learning journey
 * with detailed analytics"). That is the most recognisable generated-layout
 * pattern there is, and it told a visitor nothing they could not have guessed
 * from the category.
 *
 * What replaces it: three panels of deliberately unequal size, each showing a
 * real artifact from the product. Two of them render actual components — the
 * cell strip the sheet is built from, and a real pattern diagram — so the
 * section demonstrates the interface instead of listing adjectives about it.
 *
 * Copy is sentence case and specific. No "carefully curated", no "seamless",
 * no "journey".
 */

/* Sample cells for the illustration. Labelled as an example in the copy, and
 * drawn with the same device the real sheet uses, so it cannot be mistaken for
 * a screenshot of live progress. */
const SAMPLE_ROWS: Array<{ topic: string; solved: number; total: number }> = [
  { topic: 'Arrays & Strings', solved: 11, total: 15 },
  { topic: 'Linked Lists', solved: 9, total: 15 },
  { topic: 'Stacks & Queues', solved: 12, total: 15 },
  { topic: 'Trees & BST', solved: 6, total: 15 },
  { topic: 'Hash Tables', solved: 4, total: 10 },
  { topic: 'Sorting Algorithms', solved: 7, total: 10 },
  { topic: 'Two Pointers', solved: 3, total: 10 },
  { topic: 'Graph Basics', solved: 0, total: 8 },
];

const CELL_TONES = ['var(--af-teal)', 'var(--af-amber)', 'var(--af-danger)'];

export function Features() {
  const { problemCount, loaded } = useStats();

  return (
    <section id="features" className="relative py-20 sm:py-24">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-[2rem] sm:text-[2.5rem] text-[#f1eeea] mb-4 tracking-[-0.02em] leading-tight">
            Built around one idea: see the structure first.
          </h2>
          <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed">
            {loaded ? `${problemCount} problems` : 'Hundreds of problems'} are easy to find.
            Knowing which pattern each one belongs to — and being able to see it — is the
            part that is usually missing.
          </p>
        </div>

        {/* Deliberately unequal: a large panel, then two supporting ones. */}
        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5">

          {/* The sheet */}
          <article className="rounded-[8px] bg-[#222225] border border-[rgba(241,238,234,0.1)] p-6 sm:p-7 flex flex-col">
            <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-2">
              Your whole curriculum on one sheet
            </h3>
            <p className="text-[0.875rem] text-[#b6b1ad] leading-relaxed mb-6 max-w-[52ch]">
              Every topic, numbered in the order it should be learned, with each problem
              as a single cell. Filled means solved. You can see where you are dense and
              where you are thin without reading a single number.
            </p>

            {/* A live rendering of the same cell device the sheet uses. */}
            <div className="mt-auto" aria-label="Example of the curriculum sheet's cell strip">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-[0.6875rem] font-mono text-[#8f8a85]">example</span>
                <span className="text-[0.6875rem] font-mono text-[#8f8a85] tnum">31 topics · 343 problems</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {SAMPLE_ROWS.map((row, r) => (
                  <div key={row.topic} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
                    <span className="text-[0.75rem] text-[#b6b1ad] truncate">{row.topic}</span>
                    <span className="flex gap-[3px] flex-wrap">
                      {Array.from({ length: row.total }).map((_, i) => {
                        const solved = i < row.solved;
                        return (
                          <span
                            key={i}
                            className="sheet-cell"
                            data-solved={solved ? 'true' : 'false'}
                            style={{
                              '--cell-tone': CELL_TONES[(i + r) % CELL_TONES.length],
                              '--i': Math.min(i, 20),
                            } as React.CSSProperties}
                          />
                        );
                      })}
                    </span>
                    <span className="text-[0.75rem] text-[#8f8a85] tnum">
                      {row.solved}
                      <span className="text-[#6f6a65]">/{row.total}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Two supporting panels */}
          <div className="flex flex-col gap-5">

            <article className="rounded-[8px] bg-[#222225] border border-[rgba(241,238,234,0.1)] p-6 flex-1 flex flex-col">
              <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-2">
                Step through the algorithm first
              </h3>
              <p className="text-[0.875rem] text-[#b6b1ad] leading-relaxed mb-4">
                Pointers move, the range closes, the best answer updates. The steps come
                from running the real algorithm, so what you see is what the code does.
              </p>
              <div
                className="mt-auto rounded-[6px] p-4 flex items-center justify-center"
                style={{ background: 'var(--af-ground)' }}
              >
                <PatternDiagram topicTitle="Binary Search" className="w-full max-w-[320px] h-auto" />
              </div>
            </article>

            <article className="rounded-[8px] bg-[#222225] border border-[rgba(241,238,234,0.1)] p-6">
              <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-2">
                Your reasoning, kept with the problem
              </h3>
              <p className="text-[0.875rem] text-[#b6b1ad] leading-relaxed">
                Notes live beside the problem they belong to, in markdown, so the insight
                you had at 1am is still there next month. Progress, streaks and XP are
                recorded as you go — reported plainly, not dangled.
              </p>
            </article>

          </div>
        </div>
      </div>
    </section>
  );
}
