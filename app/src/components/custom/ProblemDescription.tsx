import type { CSSProperties } from 'react';
import { parseDescription } from './parseDescription';

/**
 * ProblemDescription — renders a problem statement using the block structure
 * produced by `parseDescription`. See that module for the parsing rules.
 */
export function ProblemDescription({ text }: { text: string }) {
  const blocks = parseDescription(text);

  if (blocks.length === 0) {
    return <p className="text-[0.9375rem] text-[#b6b1ad]">No description provided.</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.kind === 'label') {
          return (
            <p
              key={i}
              className="text-[0.6875rem] font-mono uppercase tracking-[0.1em] text-[#8f8a85] pt-2"
            >
              {block.text}
            </p>
          );
        }

        if (block.kind === 'list') {
          return (
            <ul key={i} className="space-y-1.5 list-none pl-0">
              {block.items.map((item, j) => (
                <li
                  key={j}
                  className="flex gap-2.5 text-[0.9375rem] text-[#f1eeea] leading-relaxed"
                >
                  {/* A square marker — the same vocabulary as the sheet's cells. */}
                  <span
                    className="mt-[0.5rem] w-[5px] h-[5px] rounded-[1px] flex-shrink-0"
                    style={{ background: 'var(--af-amber)' } as CSSProperties}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === 'code') {
          return (
            <p
              key={i}
              className="text-[0.875rem] text-[#f1eeea] font-mono bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[4px] px-3 py-2"
            >
              {block.text}
            </p>
          );
        }

        return (
          <p key={i} className="text-[0.9375rem] text-[#f1eeea] leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
