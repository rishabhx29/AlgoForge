/* PatternDiagram — the Pattern Studio signature.
 *
 * A real, honest diagram of the algorithmic structure the learner is working
 * on, drawn flat in the system palette. No decorative gradients, no glow.
 * The diagram reflects the TOPIC, so it stays truthful across the catalogue:
 * it never claims to depict a specific problem's input.
 *
 * Used by the Dashboard feature panel. Degrades to indexed cells (the array —
 * the atom every pattern is built on) when a topic has no specific diagram.
 */

import type { ComponentType } from 'react';

interface PatternDiagramProps {
  topicTitle: string;
  className?: string;
}

const INK = '#f1eeea';
const INK_SOFT = '#b6b1ad';
const INK_FAINT = '#8f8a85';
const CLAY = '#f0997d';
const MINT = '#b1cbbb';

function topicKey(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('two pointer')) return 'pointers';
  if (t.includes('pointer')) return 'pointers';
  if (t.includes('sliding') || t.includes('window')) return 'window';
  if (t.includes('hash') || t.includes('map') || t.includes('set')) return 'hash';
  if (t.includes('tree') || t.includes('bst') || t.includes('heap')) return 'tree';
  if (t.includes('graph') || t.includes('bfs') || t.includes('dfs') || t.includes('shortest')) return 'graph';
  if (t.includes('stack')) return 'stack';
  if (t.includes('queue') || t.includes('deque')) return 'queue';
  if (t.includes('sort')) return 'sort';
  if (t.includes('search') || t.includes('binary')) return 'search';
  if (t.includes('linked list')) return 'list';
  if (t.includes('string')) return 'string';
  if (t.includes('dp') || t.includes('dynamic')) return 'dp';
  if (t.includes('design') || t.includes('system') || t.includes('balanc') || t.includes('cach') || t.includes('database')) return 'design';
  return 'array';
}

/* Indexed cells — the base structure. Wide enough to read, quiet enough
 * to sit under a heading. */
function ArrayCells({ values, highlight }: { values: number[]; highlight?: number[] }) {
  const w = 44, h = 40, gap = 6;
  return (
    <g>
      {values.map((v, i) => (
        <g key={i} transform={`translate(${i * (w + gap)} 0)`}>
          <rect
            width={w} height={h} rx="3"
            fill={highlight?.includes(i) ? 'rgba(240,153,125,0.18)' : '#222225'}
            stroke={highlight?.includes(i) ? CLAY : '#3a393e'}
            strokeWidth="1"
          />
          <text x={w / 2} y={h / 2 + 5} textAnchor="middle" fontSize="15" fill={INK} fontFamily="'DM Sans', sans-serif" fontWeight="500">{v}</text>
          <text x={w / 2} y={h + 16} textAnchor="middle" fontSize="10" fill={INK_FAINT} fontFamily="'JetBrains Mono', monospace">{i}</text>
        </g>
      ))}
    </g>
  );
}

/* Two pointers — a pair of indices working inward over an array. */
function TwoPointers() {
  const values = [1, 8, 6, 2, 5, 4, 8, 3, 7];
  return (
    <g>
      <g transform="translate(30 46)"><ArrayCells values={values} /></g>
      {/* Pointer arrows above cells 1 and 8 */}
      {[[1, 'L'], [8, 'R']].map(([idx, label]) => (
        <g key={label as string} transform={`translate(${30 + (idx as number) * 50 + 22} 30)`}>
          <path d="M0 0 L0 12" stroke={CLAY} strokeWidth="1.5" />
          <path d="M-4 8 L0 14 L4 8" fill="none" stroke={CLAY} strokeWidth="1.5" />
          <text y="-6" textAnchor="middle" fontSize="12" fill={CLAY} fontFamily="'JetBrains Mono', monospace" fontWeight="500">{label}</text>
        </g>
      ))}
      {/* The relationship the pattern is about */}
      <path d="M80 44 L460 44" stroke={INK_FAINT} strokeWidth="1" strokeDasharray="3 4" />
      <text x="270" y="36" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">move the shorter side</text>
    </g>
  );
}

/* Sliding window — a bracket over a sub-range of cells. */
function SlidingWindow() {
  const values = [2, 1, 5, 1, 3, 2, 4, 1];
  return (
    <g>
      <g transform="translate(30 46)"><ArrayCells values={values} /></g>
      {/* Window bracket over cells 2..5 */}
      <path d="M132 38 L132 28 L288 28 L288 38" fill="none" stroke={CLAY} strokeWidth="1.5" />
      <text x="210" y="20" textAnchor="middle" fontSize="11" fill={CLAY} fontFamily="'JetBrains Mono', monospace">window</text>
      {/* Sum annotation */}
      <text x="210" y="120" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">grow · shrink · record</text>
    </g>
  );
}

/* Hash map — keys resolving to buckets. */
function HashMap() {
  const pairs: Array<[string, string]> = [['"two"', '0'], ['"seven"', '1'], ['"eleven"', '2'], ['"fifteen"', '3']];
  return (
    <g fontFamily="'JetBrains Mono', monospace">
      {pairs.map(([k, v], i) => (
        <g key={k} transform={`translate(30 ${26 + i * 28})`}>
          <rect width="118" height="22" rx="3" fill="#222225" stroke="#3a393e" />
          <text x="12" y="15" fontSize="12" fill={INK_SOFT}>{k}</text>
          <path d={`M130 ${13 + i * 0} L168 13`} stroke={INK_FAINT} strokeWidth="1" />
          <path d="M164 10 L170 13 L164 16" fill="none" stroke={INK_FAINT} strokeWidth="1" />
          <rect x="172" width="64" height="22" rx="3" fill="rgba(240,153,125,0.14)" stroke={CLAY} />
          <text x="204" y="15" textAnchor="middle" fontSize="12" fill={CLAY} fontWeight="500">{v}</text>
        </g>
      ))}
      <text x="140" y="146" textAnchor="middle" fontSize="11" fill={INK_SOFT}>key → index, in one lookup</text>
    </g>
  );
}

/* Tree — a small BST with a traced path. */
function Tree() {
  const nodes: Array<[number, number, string]> = [
    [270, 40, '8'],
    [190, 88, '3'], [350, 88, '10'],
    [150, 136, '1'], [230, 136, '6'],
    [200, 184, '4'], [260, 184, '7'],
  ];
  const edges: Array<[number, number]> = [[0, 1], [0, 2], [1, 3], [1, 4], [4, 5], [4, 6]];
  const path = new Set([0, 1, 4, 5]); // 8 → 3 → 6 → 4
  return (
    <g>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1] + 15} x2={nodes[b][0]} y2={nodes[b][1] - 15}
          stroke={path.has(a) && path.has(b) ? CLAY : '#3a393e'}
          strokeWidth={path.has(a) && path.has(b) ? 1.5 : 1}
        />
      ))}
      {nodes.map(([x, y, label], i) => (
        <g key={label}>
          <circle cx={x} cy={y} r="15" fill={path.has(i) ? 'rgba(240,153,125,0.18)' : '#222225'} stroke={path.has(i) ? CLAY : '#3a393e'} strokeWidth="1" />
          <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fill={INK} fontFamily="'DM Sans', sans-serif" fontWeight="500">{label}</text>
        </g>
      ))}
      <text x="270" y="222" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">one path per lookup</text>
    </g>
  );
}

/* Graph — vertices and adjacency edges. */
function Graph() {
  const verts: Array<[number, number, string]> = [
    [90, 60, 'A'], [230, 40, 'B'], [330, 120, 'C'], [170, 160, 'D'], [70, 190, 'E'], [280, 210, 'F'],
  ];
  const edges: Array<[number, number]> = [[0, 1], [1, 2], [0, 3], [3, 2], [3, 4], [3, 5], [2, 5]];
  const visited = new Set([0, 1]); // BFS frontier start
  return (
    <g>
      {edges.map(([a, b], i) => (
        <line key={i} x1={verts[a][0]} y1={verts[a][1]} x2={verts[b][0]} y2={verts[b][1]} stroke="#3a393e" strokeWidth="1" />
      ))}
      {verts.map(([x, y, label], i) => (
        <g key={label}>
          <rect x={x - 14} y={y - 14} width="28" height="28" rx="4" fill={visited.has(i) ? 'rgba(240,153,125,0.18)' : '#222225'} stroke={visited.has(i) ? CLAY : '#3a393e'} strokeWidth="1" />
          <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fill={INK} fontFamily="'DM Sans', sans-serif" fontWeight="500">{label}</text>
        </g>
      ))}
      <text x="200" y="252" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">explore neighbours level by level</text>
    </g>
  );
}

/* Stack — plates with the top marked. */
function Stack() {
  const items = ['push 4', 'push 7', 'push 2', 'top'];
  return (
    <g fontFamily="'JetBrains Mono', monospace">
      {items.map((label, i) => (
        <g key={label + i} transform={`translate(120 ${30 + i * 30})`}>
          <rect
            width="160" height="24" rx="3"
            fill={i === 3 ? 'rgba(240,153,125,0.18)' : '#222225'}
            stroke={i === 3 ? CLAY : '#3a393e'}
          />
          <text x="80" y="16" textAnchor="middle" fontSize="12" fill={i === 3 ? CLAY : INK_SOFT}>{label}</text>
        </g>
      ))}
      <path d="M296 152 L296 34" stroke={INK_FAINT} strokeWidth="1" strokeDasharray="3 4" />
      <path d="M292 40 L296 32 L300 40" fill="none" stroke={INK_FAINT} strokeWidth="1" />
      <text x="312" y="90" fontSize="11" fill={INK_SOFT}>last in,<tspan x="312" dy="14">first out</tspan></text>
    </g>
  );
}

/* Queue — a line with head and tail. */
function Queue() {
  const items = ['a', 'b', 'c', 'd'];
  return (
    <g fontFamily="'JetBrains Mono', monospace">
      {items.map((label, i) => (
        <g key={label} transform={`translate(${90 + i * 58} 60)`}>
          <rect
            width="50" height="40" rx="3"
            fill={i === 0 ? 'rgba(177,203,187,0.16)' : '#222225'}
            stroke={i === 0 ? MINT : '#3a393e'}
          />
          <text x="25" y="25" textAnchor="middle" fontSize="13" fill={INK}>{label}</text>
        </g>
      ))}
      <text x="90" y="124" fontSize="11" fill={MINT}>head — dequeue</text>
      <text x="266" y="124" textAnchor="end" fontSize="11" fill={CLAY}>tail — enqueue</text>
      <text x="90" y="156" fontSize="11" fill={INK_SOFT}>first in, first out</text>
    </g>
  );
}

/* Sorting — a partition mid-swap. */
function Sorting() {
  const bars = [5, 2, 8, 1, 4, 7, 3, 6];
  const sorted = [0, 1]; // first two settled
  return (
    <g>
      <line x1="30" y1="120" x2="440" y2="120" stroke="#3a393e" strokeWidth="1" />
      {bars.map((v, i) => (
        <rect
          key={i}
          x={30 + i * 52} y={120 - v * 12} width="38" height={v * 12}
          fill={sorted.includes(i) ? MINT : CLAY}
          opacity={sorted.includes(i) ? 1 : 0.85}
          rx="2"
        />
      ))}
      <text x="90" y="146" fontSize="11" fill={MINT} fontFamily="'JetBrains Mono', monospace">settled</text>
      <text x="330" y="146" fontSize="11" fill={CLAY} fontFamily="'JetBrains Mono', monospace">still comparing</text>
    </g>
  );
}

/* Binary search — lo/hi/mid over sorted cells. */
function BinarySearch() {
  const values = [1, 3, 5, 7, 9, 11, 13, 15];
  const mid = 3;
  return (
    <g>
      <g transform="translate(30 56)"><ArrayCells values={values} highlight={[mid]} /></g>
      {[[0, 'lo'], [7, 'hi']].map(([idx, label]) => (
        <g key={label as string} transform={`translate(${30 + (idx as number) * 50 + 22} 32)`}>
          <text textAnchor="middle" fontSize="12" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">{label}</text>
          <path d={`M0 4 L0 ${idx === 0 ? 18 : 14}`} stroke={INK_SOFT} strokeWidth="1" />
        </g>
      ))}
      <text x={30 + mid * 50 + 22} y="32" textAnchor="middle" fontSize="12" fill={CLAY} fontFamily="'JetBrains Mono', monospace" fontWeight="500">mid</text>
      <text x="230" y="136" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">halve the range each step</text>
    </g>
  );
}

/* Linked list — nodes chained by pointers. */
function LinkedList() {
  const values = [4, 9, 2];
  return (
    <g fontFamily="'JetBrains Mono', monospace">
      {values.map((v, i) => (
        <g key={i} transform={`translate(${40 + i * 130} 50)`}>
          <rect width="56" height="40" rx="3" fill="#222225" stroke="#3a393e" />
          <text x="28" y="25" textAnchor="middle" fontSize="14" fill={INK} fontFamily="'DM Sans', sans-serif" fontWeight="500">{v}</text>
          <rect x="56" width="24" height="40" rx="3" fill="rgba(240,153,125,0.14)" stroke={CLAY} />
          <circle cx="68" cy="20" r="3" fill={CLAY} />
          {i < values.length - 1 && (
            <>
              <path d={`M92 20 L${130 - 12} 20`} stroke={CLAY} strokeWidth="1.5" />
              <path d={`M114 16 L122 20 L114 24`} fill="none" stroke={CLAY} strokeWidth="1.5" />
            </>
          )}
        </g>
      ))}
      <path d="M440 70 L460 70 L460 90" stroke={INK_FAINT} strokeWidth="1" strokeDasharray="3 4" fill="none" />
      <text x="466" y="94" fontSize="11" fill={INK_FAINT}>null</text>
      <text x="230" y="130" textAnchor="middle" fontSize="11" fill={INK_SOFT}>each node points to the next</text>
    </g>
  );
}

/* String — characters with a comparison position. */
function StringCells() {
  const chars = ['a', 'b', 'c', 'd', 'c', 'b', 'a'];
  return (
    <g>
      <g transform="translate(60 56)">
        {chars.map((c, i) => (
          <g key={i} transform={`translate(${i * 50} 0)`}>
            <rect
              width="44" height="40" rx="3"
              fill={i === 1 || i === 5 ? 'rgba(240,153,125,0.18)' : '#222225'}
              stroke={i === 1 || i === 5 ? CLAY : '#3a393e'}
            />
            <text x="22" y="26" textAnchor="middle" fontSize="15" fill={INK} fontFamily="'DM Sans', sans-serif">{c}</text>
          </g>
        ))}
      </g>
      <text x="230" y="136" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">compare from both ends</text>
    </g>
  );
}

/* Dynamic programming — the memo table, filled along a path. */
function DpTable() {
  const cols = 6, rows = 4, cw = 46, ch = 30;
  const path: Array<[number, number]> = [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4], [3, 5]];
  const onPath = new Set(path.map(([r, c]) => `${r}-${c}`));
  return (
    <g>
      <g transform="translate(78 34)">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const on = onPath.has(`${r}-${c}`);
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cw} y={r * ch} width={cw - 4} height={ch - 4} rx="3"
                fill={on ? 'rgba(240,153,125,0.18)' : '#222225'}
                stroke={on ? CLAY : '#3a393e'}
                strokeWidth="1"
              />
            );
          })
        )}
      </g>
      <text x="250" y="166" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">
        each cell built from the ones before it
      </text>
    </g>
  );
}

/* System design — the shape of a request path. Abstract boxes and connectors,
 * because that is genuinely what the subject is. */
function DesignFlow() {
  const nodes: Array<[number, number, string]> = [
    [30, 66, 'client'],
    [140, 66, 'balancer'],
    [252, 30, 'service A'],
    [252, 102, 'service B'],
    [372, 66, 'store'],
  ];
  const edges: Array<[number, number]> = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]];
  return (
    <g>
      {edges.map(([a, b], i) => {
        const [x1, y1] = nodes[a];
        const [x2, y2] = nodes[b];
        return (
          <path
            key={i}
            d={`M${x1 + 92} ${y1 + 15} H${x1 + 108} V${y2 + 15} H${x2}`}
            fill="none"
            stroke="#4a4744"
            strokeWidth="1"
          />
        );
      })}
      {nodes.map(([x, y, label]) => (
        <g key={label}>
          <rect x={x} y={y} width="92" height="30" rx="3" fill="#222225" stroke="#3a393e" />
          <text x={x + 46} y={y + 19} textAnchor="middle" fontSize="11" fill={INK} fontFamily="'JetBrains Mono', monospace">
            {label}
          </text>
        </g>
      ))}
      <text x="250" y="166" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">
        one request, many decisions
      </text>
    </g>
  );
}

const CANVAS_W = 500;

export function PatternDiagram({ topicTitle, className }: PatternDiagramProps) {
  const key = topicKey(topicTitle);
  const diagrams: Record<string, ComponentType> = {
    pointers: TwoPointers,
    window: SlidingWindow,
    hash: HashMap,
    tree: Tree,
    graph: Graph,
    stack: Stack,
    queue: Queue,
    sort: Sorting,
    search: BinarySearch,
    list: LinkedList,
    string: StringCells,
    dp: DpTable,
    design: DesignFlow,
    array: () => (
      <g>
        <g transform="translate(60 56)"><ArrayCells values={[3, 1, 4, 1, 5, 9]} /></g>
        <text x="230" y="136" textAnchor="middle" fontSize="11" fill={INK_SOFT} fontFamily="'JetBrains Mono', monospace">the structure every pattern builds on</text>
      </g>
    ),
  };
  const Diagram = diagrams[key] ?? diagrams.array;
  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} 180`}
      className={className}
      role="img"
      aria-label={`Illustration of the ${topicTitle} pattern`}
    >
      <Diagram />
    </svg>
  );
}
