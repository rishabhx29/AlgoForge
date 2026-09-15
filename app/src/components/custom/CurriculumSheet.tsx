import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * CurriculumSheet — the Pattern Studio identity surface.
 *
 * The whole curriculum, on one sheet. Every topic is a numbered row, and every
 * problem in that topic is a single cell: outlined when untouched, filled in its
 * difficulty tone once solved.
 *
 * Why this and not another set of cards: the strip is a real read-out. At a
 * glance you can see where you are dense, where you are sparse, and how far a
 * path runs. It carries information no stat card carries, which is what makes
 * it worth remembering — it does not depend on motion to be interesting.
 *
 * Reference principle (not a copy): the numbered, progress-fractioned
 * curriculum sheet is takeUforward's proven structure, and the dense scannable
 * table is LeetCode's. The cell strip is this product's own device.
 */

interface ProblemRow {
  id: string;
  title: string;
  difficulty: string;
  topic_id?: string;
  order_index?: number;
}

interface TopicRow {
  id: string;
  title: string;
  path_slug?: string;
  order_index?: number;
}

interface PathRow {
  slug: string;
  title: string;
  order_index?: number;
}

interface CurriculumSheetProps {
  paths: PathRow[];
  topics: TopicRow[];
  problems: ProblemRow[];
  solvedIds: Set<string>;
  onOpenTopic: (topicId: string) => void;
}

/* Difficulty → cell tone. Solved cells carry their difficulty, so the strip
 * reads as a mosaic of what you have actually done rather than a single bar. */
const TONE: Record<string, string> = {
  Easy: 'var(--af-teal)',
  Medium: 'var(--af-amber)',
  Hard: 'var(--af-danger)',
};

const rank = (d: string) => (d === 'Easy' ? 0 : d === 'Medium' ? 1 : 2);

export function CurriculumSheet({ paths, topics, problems, solvedIds, onOpenTopic }: CurriculumSheetProps) {
  /* Untouched paths start collapsed. A learner opening this for the first time
   * would otherwise face 313 empty cells, which is accurate but says nothing;
   * collapsed, the sheet opens on the paths they have actually started and the
   * rest stay one click away. Any path with progress is open by default. */
  const [openPaths, setOpenPaths] = useState<Record<string, boolean>>({});

  /* Group topics under their path, ordered the way the curriculum is meant to
   * be walked. A topic with no problems is still shown — hiding it would make
   * the sheet disagree with the catalogue. */
  const groups = useMemo(() => {
    const byPath = new Map<string, TopicRow[]>();
    for (const t of topics) {
      const key = t.path_slug ?? 'other';
      if (!byPath.has(key)) byPath.set(key, []);
      byPath.get(key)!.push(t);
    }

    const problemsByTopic = new Map<string, ProblemRow[]>();
    for (const p of problems) {
      const key = p.topic_id ?? 'unassigned';
      if (!problemsByTopic.has(key)) problemsByTopic.set(key, []);
      problemsByTopic.get(key)!.push(p);
    }
    for (const list of problemsByTopic.values()) {
      list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }

    const ordered = [...paths].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const known = new Set(ordered.map((p) => p.slug));
    const extra = [...byPath.keys()].filter((k) => !known.has(k) && k !== 'other');

    const build = (slug: string, title: string) => {
      const list = (byPath.get(slug) ?? [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((t) => {
          const items = problemsByTopic.get(t.id) ?? [];
          const solved = items.filter((p) => solvedIds.has(p.id));
          const next = items
            .filter((p) => !solvedIds.has(p.id))
            .sort((a, b) => rank(a.difficulty) - rank(b.difficulty))[0];
          return { topic: t, items, solvedCount: solved.length, next: next ?? null };
        });
      return { slug, title, rows: list };
    };

    /* Step numbers are assigned here, once, in curriculum order — so they stay
     * stable when a path is collapsed or expanded. A step number that changed
     * as you opened and closed groups would be worse than no number at all. */
    let step = 0;
    return [
      ...ordered.map((p) => build(p.slug, p.title)),
      ...extra.map((slug) => build(slug, slug.replace(/-/g, ' '))),
    ]
      .filter((g) => g.rows.length > 0)
      .map((g) => {
        const total = g.rows.reduce((n, r) => n + r.items.length, 0);
        const solved = g.rows.reduce((n, r) => n + r.solvedCount, 0);
        return {
          ...g,
          total,
          solved,
          pct: total > 0 ? Math.round((solved / total) * 100) : 0,
          rows: g.rows.map((r) => ({ ...r, step: (step += 1) })),
        };
      });
  }, [paths, topics, problems, solvedIds]);

  return (
    <div className="sheet">
      {groups.map((group) => {
        const expanded = openPaths[group.slug] ?? group.solved > 0;
        const panelId = `sheet-panel-${group.slug}`;

        return (
          <section className="sheet-group" key={group.slug}>
            <h3 className="sr-only">{group.title}</h3>
            <button
              type="button"
              className="sheet-group-head"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpenPaths((prev) => ({ ...prev, [group.slug]: !expanded }))}
            >
              <span className="sheet-group-toggle" aria-hidden="true">
                <span className={`sheet-chevron${expanded ? ' is-open' : ''}`} />
                <span className="sheet-group-title">{group.title}</span>
              </span>
              <span className="sheet-group-meta">
                <span className="tnum">
                  {group.solved}
                  <span className="sheet-of">/{group.total}</span>
                </span>
                <span className="sheet-group-pct tnum">{group.pct}%</span>
              </span>
            </button>

            {expanded && (
              <div className="ruled" id={panelId}>
                {group.rows.map((row) => {
                  const total = row.items.length;
                  const done = row.solvedCount;
                  const complete = total > 0 && done === total;
                  return (
                    <button
                      key={row.topic.id}
                      type="button"
                      onClick={() => onOpenTopic(row.topic.id)}
                      className="sheet-row row-interactive"
                      aria-label={`Step ${row.step}: ${row.topic.title}, ${done} of ${total} solved${row.next ? `, next is ${row.next.title}` : ''}`}
                    >
                      <span className="sheet-step tnum" aria-hidden="true">
                        {String(row.step).padStart(2, '0')}
                      </span>

                      <span className="sheet-topic">
                        <span className={`sheet-topic-name${complete ? ' is-complete' : ''}`}>
                          {row.topic.title}
                        </span>
                        {/* Revealed on hover/focus: the actual next problem, so the
                            row answers "what would I do here?" without a click. */}
                        <span className="sheet-next">
                          {row.next ? `Next · ${row.next.title}` : complete ? 'Pattern complete' : 'No problems yet'}
                        </span>
                      </span>

                      {/* The strip. One cell per problem — this is the read-out. */}
                      <span className="sheet-strip" aria-hidden="true">
                        {total === 0 ? (
                          <span className="sheet-empty">—</span>
                        ) : (
                          row.items.map((p, i) => {
                            const isSolved = solvedIds.has(p.id);
                            return (
                              <span
                                key={p.id}
                                className="sheet-cell"
                                data-solved={isSolved ? 'true' : 'false'}
                                style={
                                  {
                                    '--cell-tone': TONE[p.difficulty] ?? 'var(--af-ink-soft)',
                                    '--i': Math.min(i, 24),
                                  } as CSSProperties
                                }
                                title={`${p.title} · ${p.difficulty}${isSolved ? ' · solved' : ''}`}
                              />
                            );
                          })
                        )}
                      </span>

                      <span className="sheet-fraction tnum" aria-hidden="true">
                        <strong>{done}</strong>
                        <span className="sheet-of">/{total}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
