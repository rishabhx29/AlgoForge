import type { CSSProperties } from 'react';
import type { BinarySearchStep, BfsStep, TwoPointerStep, WindowStep } from './traces';
import { BS_ARRAY, GRAPH, HEIGHTS } from './traces';

/**
 * The chart bodies for each stepping explainer. Each one draws only the current
 * step; the shell owns the controls, the readout and the note.
 *
 * Positions are driven through CSS custom properties so the browser transitions
 * them on step change without any animation code.
 */

/* ── Two pointers ────────────────────────────────────────────────────────── */
export function TwoPointersChart({ step }: { step: TwoPointerStep }) {
  const maxHeight = Math.max(...HEIGHTS);
  const n = HEIGHTS.length;
  const style = {
    '--tpe-left': `${(step.l / n) * 100}%`,
    '--tpe-width': `${((step.r - step.l + 1) / n) * 100}%`,
    '--tpe-height': `${(step.height / maxHeight) * 100}%`,
  } as CSSProperties;

  return (
    <div className="tpe-plot-wrap" style={style}>
      <div className="tpe-flag tpe-flag-left" style={{ left: `${((step.l + 0.5) / n) * 100}%` }} aria-hidden="true">
        L
      </div>
      <div className="tpe-flag tpe-flag-right" style={{ left: `${((step.r + 0.5) / n) * 100}%` }} aria-hidden="true">
        R
      </div>
      <div className="tpe-plot">
        <div className="tpe-water" aria-hidden="true" />
        {HEIGHTS.map((h, i) => (
          <div className="tpe-col" key={i}>
            <div
              className="tpe-bar"
              data-pointer={i === step.l ? 'left' : i === step.r ? 'right' : 'none'}
              style={{ height: `${(h / maxHeight) * 100}%` }}
            >
              <span className="tpe-bar-value">{h}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="tpe-labels" aria-hidden="true">
        {HEIGHTS.map((_, i) => (
          <span className="tpe-index" key={i}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Sliding window ──────────────────────────────────────────────────────── */
export function SlidingWindowChart({ step }: { step: WindowStep }) {
  const n = step.chars.length;
  return (
    <div className="sw-wrap">
      <div
        className="sw-bracket"
        style={{
          '--sw-left': `${(step.left / n) * 100}%`,
          '--sw-width': `${((step.right - step.left + 1) / n) * 100}%`,
        } as CSSProperties}
        aria-hidden="true"
      >
        <span className="sw-bracket-label">window</span>
      </div>
      <div className="sw-row">
        {step.chars.map((c, i) => {
          const inWindow = i >= step.left && i <= step.right;
          return (
            <span className="sw-cell" key={i} data-in={inWindow ? 'true' : 'false'}>
              <span className="sw-char">{c}</span>
            </span>
          );
        })}
      </div>
      <div className="sw-labels" aria-hidden="true">
        {step.chars.map((_, i) => (
          <span className="tpe-index" key={i}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Binary search ───────────────────────────────────────────────────────── */
export function BinarySearchChart({ step }: { step: BinarySearchStep }) {
  const n = BS_ARRAY.length;
  return (
    <div className="bs-wrap">
      <div
        className="bs-bracket"
        style={{
          '--bs-left': `${(step.lo / n) * 100}%`,
          '--bs-width': `${((step.hi - step.lo + 1) / n) * 100}%`,
        } as CSSProperties}
        aria-hidden="true"
      >
        <span className="sw-bracket-label">still possible</span>
      </div>
      <div className="sw-row">
        {BS_ARRAY.map((v, i) => {
          const inRange = i >= step.lo && i <= step.hi;
          return (
            <span
              className="sw-cell"
              key={i}
              data-in={inRange ? 'true' : 'false'}
              data-mid={i === step.mid ? 'true' : 'false'}
              data-found={step.found && i === step.mid ? 'true' : 'false'}
            >
              <span className="sw-char">{v}</span>
            </span>
          );
        })}
      </div>
      <div className="sw-labels" aria-hidden="true">
        {BS_ARRAY.map((_, i) => (
          <span className="tpe-index" key={i}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── BFS ─────────────────────────────────────────────────────────────────── */
const NODE_POS: Array<[number, number]> = [
  [250, 24], // 0
  [150, 70], // 1
  [350, 70], // 2
  [95, 118], // 3
  [205, 118], // 4
  [295, 118], // 5
  [405, 118], // 6
];

export function BfsChart({ step }: { step: BfsStep }) {
  const edges: Array<[number, number]> = [];
  GRAPH.forEach((neighbours, from) => {
    neighbours.forEach((to) => edges.push([from, to]));
  });
  const visited = new Set(step.visited);
  const queued = new Set(step.queue);

  return (
    <div className="bfs-wrap">
      <svg viewBox="0 0 500 145" className="bfs-svg" role="presentation">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={NODE_POS[a][0]}
            y1={NODE_POS[a][1]}
            x2={NODE_POS[b][0]}
            y2={NODE_POS[b][1]}
            stroke={visited.has(a) && visited.has(b) ? 'var(--af-amber)' : '#4a4744'}
            strokeWidth="1.5"
          />
        ))}
        {NODE_POS.map(([x, y], i) => {
          const state = i === step.node ? 'current' : visited.has(i) ? 'visited' : queued.has(i) ? 'queued' : 'unseen';
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="15"
                fill={
                  state === 'current'
                    ? 'var(--af-amber)'
                    : state === 'visited'
                      ? 'rgba(240,153,125,0.18)'
                      : 'var(--af-surface)'
                }
                stroke={
                  state === 'current'
                    ? 'var(--af-amber)'
                    : state === 'visited'
                      ? 'var(--af-amber)'
                      : state === 'queued'
                        ? 'var(--af-teal)'
                        : '#4a4744'
                }
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="12"
                fontFamily="'JetBrains Mono', monospace"
                fill={state === 'current' ? 'var(--af-ground)' : 'var(--af-ink)'}
              >
                {i}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="bfs-queue">
        <span className="bfs-queue-label">queue</span>
        {step.queue.length === 0 ? (
          <span className="bfs-empty">empty</span>
        ) : (
          step.queue.map((n) => (
            <span className="bfs-chip" key={n}>
              {n}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
