/**
 * traces.ts — the algorithms behind the stepping explainers.
 *
 * Each function runs the real algorithm over the real input and records the
 * state it passed through. Nothing here is an authored animation: the steps are
 * a trace of genuine execution, so the numbers on screen cannot drift from the
 * truth, and a change to the algorithm changes the explainer with it.
 *
 * Kept free of React so the traces can be reasoned about — and asserted
 * against known answers in verification — on their own.
 */

export interface Readout {
  key: string;
  value: string | number;
  /** Marks the figure that just improved, so it can be emphasised. */
  emphasis?: boolean;
}

export interface StepBase {
  note: string;
  readout: Readout[];
}

/* ── Two pointers · Container With Most Water ───────────────────────────────
 * Input: heights. Answer for [1,8,6,2,5,4,8,3,7] is 49. */
export const HEIGHTS = [1, 8, 6, 2, 5, 4, 8, 3, 7];

export interface TwoPointerStep extends StepBase {
  l: number;
  r: number;
  width: number;
  height: number;
  area: number;
  best: number;
  improved: boolean;
}

export function traceTwoPointers(h: number[]): TwoPointerStep[] {
  const steps: TwoPointerStep[] = [];
  let l = 0;
  let r = h.length - 1;
  let best = 0;

  while (l < r) {
    const width = r - l;
    const height = Math.min(h[l], h[r]);
    const area = width * height;
    const improved = area > best;
    if (improved) best = area;

    const note =
      steps.length === 0
        ? `Widest pair available. The shorter line (${height}) caps the water, so that is the side to move.`
        : improved
          ? `Narrower, but taller enough to matter — new best of ${area}.`
          : `Narrower and no taller (${height}). This pair cannot beat ${best}, and neither can any pair inside it.`;

    steps.push({
      l,
      r,
      width,
      height,
      area,
      best,
      improved,
      note,
      readout: [
        { key: 'width', value: width },
        { key: 'limiting height', value: height },
        { key: 'area', value: area, emphasis: improved },
        { key: 'best so far', value: best },
      ],
    });

    if (h[l] < h[r]) l += 1;
    else r -= 1;
  }
  return steps;
}

/* ── Sliding window · Longest substring without repeats ─────────────────────
 * Answer for "abcabcbb" is 3 ("abc"). */
export const SW_INPUT = 'abcabcbb';

export interface WindowStep extends StepBase {
  left: number;
  right: number;
  window: string;
  chars: string[];
  best: number;
  shrunk: boolean;
}

export function traceSlidingWindow(s: string): WindowStep[] {
  const steps: WindowStep[] = [];
  const seen = new Set<string>();
  let left = 0;
  let best = 0;

  for (let right = 0; right < s.length; right += 1) {
    const ch = s[right];
    let shrunk = false;

    // The whole point of the pattern: the left edge only ever moves forward.
    while (seen.has(ch)) {
      seen.delete(s[left]);
      left += 1;
      shrunk = true;
    }
    seen.add(ch);

    const length = right - left + 1;
    const improved = length > best;
    if (improved) best = length;

    const window = s.slice(left, right + 1);
    const note = shrunk
      ? `"${ch}" was already in the window, so the left edge advanced to ${left}. Window is now "${window}".`
      : improved
        ? `"${ch}" is new. Window grew to "${window}" — longest so far at ${length}.`
        : `"${ch}" is new, but the window stayed at ${length} characters.`;

    steps.push({
      left,
      right,
      window,
      chars: s.split(''),
      best,
      shrunk,
      note,
      readout: [
        { key: 'window', value: `"${window}"` },
        { key: 'length', value: length },
        { key: 'left', value: left },
        { key: 'longest', value: best, emphasis: improved },
      ],
    });
  }
  return steps;
}

/* ── Binary search · a sorted range closing from both sides ────────────────
 * Answer for the array below with target 21 is index 10, found in 4 probes. */
export const BS_ARRAY = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
export const BS_TARGET = 21;

export interface BinarySearchStep extends StepBase {
  lo: number;
  hi: number;
  mid: number;
  value: number;
  found: boolean;
  wentRight: boolean | null;
}

export function traceBinarySearch(arr: number[], target: number): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let lo = 0;
  let hi = arr.length - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const value = arr[mid];
    const found = value === target;
    const wentRight = found ? null : value < target;

    const note = found
      ? `arr[${mid}] is ${value} — that is the target.`
      : wentRight
        ? `${value} is below ${target}, so everything at or left of index ${mid} is ruled out.`
        : `${value} is above ${target}, so everything at or right of index ${mid} is ruled out.`;

    steps.push({
      lo,
      hi,
      mid,
      value,
      found,
      wentRight,
      note,
      readout: [
        { key: 'range', value: `${lo}–${hi}` },
        { key: 'probe index', value: mid },
        { key: 'value', value },
        { key: 'candidates', value: hi - lo + 1, emphasis: true },
      ],
    });

    if (found) break;
    if (wentRight) lo = mid + 1;
    else hi = mid - 1;
  }
  return steps;
}

/* ── BFS · breadth-first traversal of a small graph ────────────────────────
 * Visits 7 nodes, level by level, from node 0. */
export const GRAPH: number[][] = [
  [1, 2], // 0
  [3, 4], // 1
  [5, 6], // 2
  [], // 3
  [], // 4
  [], // 5
  [], // 6
];

export interface BfsStep extends StepBase {
  node: number;
  queue: number[];
  visited: number[];
  depth: number;
  discovered: number[];
}

export function traceBfs(graph: number[][], start = 0): BfsStep[] {
  const steps: BfsStep[] = [];
  const visited: number[] = [];
  const queue: number[] = [start];
  const seen = new Set<number>([start]);
  const depth = new Map<number, number>([[start, 0]]);

  while (queue.length > 0) {
    const node = queue.shift() as number;
    visited.push(node);
    const d = depth.get(node) ?? 0;

    const discovered: number[] = [];
    for (const next of graph[node] ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        depth.set(next, d + 1);
        queue.push(next);
        discovered.push(next);
      }
    }

    const note =
      discovered.length > 0
        ? `Visit ${node} at depth ${d}. Its unvisited neighbours (${discovered.join(', ')}) join the back of the queue.`
        : `Visit ${node} at depth ${d}. It has no unvisited neighbours, so the queue simply shortens.`;

    steps.push({
      node,
      queue: [...queue],
      visited: [...visited],
      depth: d,
      discovered,
      note,
      readout: [
        { key: 'visiting', value: node },
        { key: 'depth', value: d },
        { key: 'queue', value: queue.length ? queue.join(', ') : 'empty' },
        { key: 'visited', value: visited.length, emphasis: true },
      ],
    });
  }
  return steps;
}
