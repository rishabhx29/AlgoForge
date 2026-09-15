import { useMemo } from 'react';
import { Stepper } from './Stepper';
import { BfsChart, BinarySearchChart, SlidingWindowChart, TwoPointersChart } from './visuals';
import {
  BS_ARRAY,
  BS_TARGET,
  GRAPH,
  HEIGHTS,
  SW_INPUT,
  traceBinarySearch,
  traceBfs,
  traceSlidingWindow,
  traceTwoPointers,
} from './traces';

/**
 * PatternExplainer — picks the stepping explainer that matches a topic.
 *
 * Returns null when a topic has no stepper, so the caller can fall back to the
 * static structural diagram rather than showing a mismatched animation. Each
 * explainer is driven by the real algorithm in `traces.ts`.
 */

export type ExplainerKind = 'two-pointers' | 'sliding-window' | 'binary-search' | 'bfs';

export function explainerFor(topicTitle: string): ExplainerKind | null {
  const t = topicTitle.toLowerCase();
  if (t.includes('two pointer') || t.includes('pointer')) return 'two-pointers';
  if (t.includes('sliding') || t.includes('window')) return 'sliding-window';
  if (t.includes('binary') || t.includes('search')) return 'binary-search';
  if (t.includes('graph') || t.includes('bfs') || t.includes('dfs')) return 'bfs';
  return null;
}

export function PatternExplainer({ topicTitle, className }: { topicTitle: string; className?: string }) {
  const kind = explainerFor(topicTitle);

  /* All four traces are built unconditionally so the hooks stay stable. Each
   * runs over a handful of elements, so the cost is microseconds — far cheaper
   * than the bug an early return above a hook would cause. */
  const twoPointers = useMemo(() => traceTwoPointers(HEIGHTS), []);
  const slidingWindow = useMemo(() => traceSlidingWindow(SW_INPUT), []);
  const binarySearch = useMemo(() => traceBinarySearch(BS_ARRAY, BS_TARGET), []);
  const bfs = useMemo(() => traceBfs(GRAPH), []);

  if (!kind) return null;

  if (kind === 'two-pointers') {
    const last = twoPointers[twoPointers.length - 1];
    return (
      <div className={className}>
        <Stepper
          steps={twoPointers}
          renderVisual={(s) => <TwoPointersChart step={s} />}
          describe={(s) =>
            `Heights ${HEIGHTS.join(', ')}. Left pointer at index ${s.l}, right pointer at index ${s.r}. Width ${s.width}, limiting height ${s.height}, area ${s.area}, best ${s.best}.`
          }
          closingNote={`Pointers met. The largest container holds ${last.best}.`}
        />
      </div>
    );
  }

  if (kind === 'sliding-window') {
    const last = slidingWindow[slidingWindow.length - 1];
    return (
      <div className={className}>
        <Stepper
          steps={slidingWindow}
          renderVisual={(s) => <SlidingWindowChart step={s} />}
          describe={(s) =>
            `String ${SW_INPUT}. Window covers indices ${s.left} to ${s.right}: "${s.window}", length ${s.right - s.left + 1}. Longest so far ${s.best}.`
          }
          closingNote={`End of string. The longest substring without repeating characters is ${last.best} characters.`}
        />
      </div>
    );
  }

  if (kind === 'binary-search') {
    const last = binarySearch[binarySearch.length - 1];
    return (
      <div className={className}>
        <Stepper
          steps={binarySearch}
          renderVisual={(s) => <BinarySearchChart step={s} />}
          describe={(s) =>
            `Sorted array of ${BS_ARRAY.length} values, searching for ${BS_TARGET}. Range ${s.lo} to ${s.hi}, probing index ${s.mid} which holds ${s.value}.`
          }
          closingNote={`Found ${BS_TARGET} at index ${last.mid} in ${binarySearch.length} probes, out of ${BS_ARRAY.length} candidates.`}
          finishLabel="Finish"
        />
      </div>
    );
  }

  const lastBfs = bfs[bfs.length - 1];
  return (
    <div className={className}>
      <Stepper
        steps={bfs}
        renderVisual={(s) => <BfsChart step={s} />}
        describe={(s) =>
          `Graph traversal. Visiting node ${s.node} at depth ${s.depth}. Queue holds ${s.queue.length ? s.queue.join(', ') : 'nothing'}. ${s.visited.length} nodes visited.`
        }
        closingNote={`Queue empty. All ${lastBfs.visited.length} nodes visited, level by level.`}
      />
    </div>
  );
}
