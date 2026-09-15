/**
 * parseDescription — turns a problem statement's line structure into blocks.
 *
 * The API returns statements as plain text with meaningful line structure:
 *
 *   Given an integer array and a target value, …
 *
 *   Input
 *   - Line 1: integer n
 *   - Line 2: n space-separated integers
 *
 *   Output
 *   Two space-separated indices.
 *
 * Rendering that with `whitespace-pre-wrap` throws the structure away — the
 * labels stop being labels and the bullets stop being a list, on the one screen
 * where the text IS the task.
 *
 * Deliberately not a markdown parser: the input is a narrow, known format, and
 * a general parser would handle cases that do not occur while risking the ones
 * that do. Kept free of React so it can be tested against the real catalogue.
 */

const LABEL =
  /^(input|output|example\s*\d*|examples?|constraints?|explanation|note|notes|follow[\s-]?up|approach|hint)\s*:?\s*$/i;
const LABEL_INLINE =
  /^(input|output|example\s*\d*|constraints?|explanation|note|approach|hint)\s*:\s*(.+)$/i;
/* Labels whose value is a terse, monospace-worthy value ("Input: 1 2 3")
 * rather than prose ("Note: this works because…"). */
const TERSE_LABEL = /^(input|output|example\s*\d*|constraints?)$/i;
const BULLET = /^\s*[-*•]\s+/;

export type Block =
  | { kind: 'label'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; text: string };

export function parseDescription(raw: string): Block[] {
  const lines = (raw || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ kind: 'list', items: list });
      list = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // "Input" / "Constraints" on a line of its own.
    if (LABEL.test(trimmed)) {
      flushAll();
      blocks.push({ kind: 'label', text: trimmed.replace(/:$/, '') });
      continue;
    }

    // "Input: 1 2 3" — label and value on one line. A terse value becomes a
    // monospace chip; prose stays prose, because monospacing a sentence is a
    // lie about what it is.
    const inline = trimmed.match(LABEL_INLINE);
    if (inline) {
      flushAll();
      blocks.push({ kind: 'label', text: inline[1] });
      blocks.push(
        TERSE_LABEL.test(inline[1])
          ? { kind: 'code', text: inline[2] }
          : { kind: 'paragraph', text: inline[2] }
      );
      continue;
    }

    if (BULLET.test(trimmed)) {
      flushParagraph();
      list.push(trimmed.replace(BULLET, '').trim());
      continue;
    }

    // A non-bullet line inside a list continues the item above it, rather than
    // starting a paragraph that would break the list in two.
    if (list.length) {
      list[list.length - 1] += ` ${trimmed}`;
      continue;
    }

    paragraph.push(trimmed);
  }

  flushAll();
  return blocks;
}
