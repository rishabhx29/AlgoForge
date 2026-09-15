/**
 * Correctness check for the explainer traces, independent of the UI.
 *
 * Each explainer claims to show a real algorithm running. These assertions are
 * what makes that claim true: they compare the trace's final state against the
 * known answer for each input. If someone later "tidies" a trace into an
 * authored sequence, this is where it fails.
 *
 * Run with Node's type stripping (no build step, no dependencies):
 *   node --experimental-strip-types app/scripts/check-traces.ts
 */
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
} from '../src/components/custom/stepper/traces.ts';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

/* ── Two pointers · Container With Most Water ── */
const tp = traceTwoPointers(HEIGHTS);
check('two pointers: final best area is 49', tp[tp.length - 1].best, 49);
check('two pointers: first pair spans the full width', [tp[0].l, tp[0].r, tp[0].area], [0, 8, 8]);
check('two pointers: pointers never cross', tp.every((s) => s.l < s.r), true);
check('two pointers: best never decreases', tp.every((s, i) => i === 0 || s.best >= tp[i - 1].best), true);
check('two pointers: every step reports a positive width', tp.every((s) => s.width > 0), true);

/* ── Sliding window · longest substring without repeats ── */
const sw = traceSlidingWindow(SW_INPUT);
check('sliding window: "abcabcbb" answer is 3', sw[sw.length - 1].best, 3);
check('sliding window: covers every character exactly once', sw.length, SW_INPUT.length);
check('sliding window: left edge only moves forward', sw.every((s, i) => i === 0 || s.left >= sw[i - 1].left), true);
check('sliding window: window always matches the source', sw.every((s) => s.window === SW_INPUT.slice(s.left, s.right + 1)), true);
check('sliding window: no window ever contains a repeat', sw.every((s) => new Set(s.window).size === s.window.length), true);

/* ── Binary search ── */
const bs = traceBinarySearch(BS_ARRAY, BS_TARGET);
check('binary search: finds the target', bs[bs.length - 1].found, true);
check('binary search: lands on the right index', bs[bs.length - 1].mid, BS_ARRAY.indexOf(BS_TARGET));
check('binary search: probes are within the live range', bs.every((s) => s.mid >= s.lo && s.mid <= s.hi), true);
check('binary search: range strictly shrinks after a miss', bs.slice(0, -1).every((s, i) => (bs[i + 1].hi - bs[i + 1].lo) < (s.hi - s.lo)), true);
check('binary search: uses log2 probes at worst', bs.length <= Math.ceil(Math.log2(BS_ARRAY.length)) + 1, true);

/* ── BFS ── */
const bfs = traceBfs(GRAPH);
check('bfs: visits every node exactly once', bfs[bfs.length - 1].visited.length, GRAPH.length);
check('bfs: no node is visited twice', new Set(bfs[bfs.length - 1].visited).size, GRAPH.length);
check('bfs: queue drains to empty', bfs[bfs.length - 1].queue.length, 0);
check('bfs: depth never decreases across steps', bfs.every((s, i) => i === 0 || s.depth >= bfs[i - 1].depth), true);
check('bfs: start node is visited first', bfs[0].node, 0);
check('bfs: nodes are discovered before they are visited', bfs.every((s) => s.visited.length + s.queue.length <= GRAPH.length), true);

console.log(`\n${failures === 0 ? 'ALL TRACES CORRECT' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
