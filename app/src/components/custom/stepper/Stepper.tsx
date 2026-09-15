import { useState } from 'react';
import type { ReactNode } from 'react';
import type { StepBase } from './traces';

/**
 * Stepper — the shared shell for every stepping explainer.
 *
 * One control vocabulary (Back / Step / Run again), one readout grid, one note
 * area. Each pattern supplies only its own visualisation, so four explainers
 * behave identically and a learner learns the controls once.
 *
 * The readout is text, always. The visual is an aid to reading the change —
 * never the only thing carrying it — which is also what makes the whole thing
 * survive reduced motion.
 */

interface StepperProps<T extends StepBase> {
  steps: T[];
  /** Draws the pattern-specific chart for the current step. */
  renderVisual: (step: T) => ReactNode;
  /** A screen-reader description of the current state. */
  describe: (step: T) => string;
  /** Shown once the trace is finished. */
  closingNote: string;
  /** Verb on the final advance, e.g. "Finish". */
  finishLabel?: string;
}

export function Stepper<T extends StepBase>({
  steps,
  renderVisual,
  describe,
  closingNote,
  finishLabel = 'Finish',
}: StepperProps<T>) {
  const [index, setIndex] = useState(0);
  const done = index >= steps.length;
  const current = steps[Math.min(index, steps.length - 1)];

  return (
    <div className="tpe">
      <div className="tpe-chart" role="img" aria-label={describe(current)}>
        {renderVisual(current)}
      </div>

      <div className="tpe-readout">
        {current.readout.map((r) => (
          <div key={r.key}>
            <span className="tpe-key">{r.key}</span>
            <span className={`tpe-val tnum${r.emphasis ? ' is-best' : ''}`}>{r.value}</span>
          </div>
        ))}
      </div>

      <p className="tpe-note">{done ? closingNote : current.note}</p>

      <div className="tpe-controls">
        <button
          type="button"
          className="tpe-btn"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="tpe-btn tpe-btn-primary"
          onClick={() => setIndex((i) => (i >= steps.length ? 0 : i + 1))}
        >
          {done ? 'Run again' : index === steps.length - 1 ? finishLabel : 'Step'}
        </button>
        <span className="tpe-progress tnum">
          {Math.min(index + 1, steps.length)} / {steps.length}
        </span>
      </div>
    </div>
  );
}
