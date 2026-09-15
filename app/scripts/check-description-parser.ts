/**
 * Checks the description parser against the REAL catalogue.
 *
 * The parser's job is to preserve structure that is already in the API's text.
 * A hand-written sample would prove nothing about whether it handles the actual
 * corpus — so this fetches every description and asserts the parser finds the
 * structure that is genuinely there, and mangles nothing.
 *
 * Run (no build step, no dependencies):
 *   node --experimental-strip-types app/scripts/check-description-parser.ts
 */
import { parseDescription } from '../src/components/custom/parseDescription.ts';

const API = 'http://127.0.0.1:5000';

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.log(`FAIL  ${msg}`);
};

const problems = await (await fetch(`${API}/api/content/problems`)).json();
console.log(`Checking ${problems.length} descriptions from the live catalogue\n`);

let withLabels = 0;
let withLists = 0;
let withParagraphs = 0;
let totalBlocks = 0;

for (const p of problems) {
  const raw: string = p.description ?? '';
  const blocks = parseDescription(raw);
  totalBlocks += blocks.length;

  // 1. Nothing is ever dropped. Reassembling the text content must account for
  //    every non-whitespace character of the source.
  const reassembled = blocks
    .map((b) => (b.kind === 'list' ? b.items.join(' ') : b.text))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const source = raw.replace(/\s+/g, ' ').trim();
  /* Normalise away the characters the parser is *supposed* to consume — the
   * bullet markers and the label colon — plus whitespace and case. Hyphens are
   * stripped from BOTH sides, so a real one inside a word ("32-bit") is
   * unaffected by the comparison while a bullet marker is neutralised. */
  const norm = (s: string) => s.toLowerCase().replace(/[-*•:\s]/g, '');
  if (norm(reassembled) !== norm(source)) {
    fail(`content lost in "${p.title}"\n      source: ${norm(source).slice(0, 90)}\n      parsed: ${norm(reassembled).slice(0, 90)}`);
  }

  // 2. No block is empty.
  for (const b of blocks) {
    if (b.kind === 'list') {
      if (b.items.length === 0) fail(`empty list block in "${p.title}"`);
      if (b.items.some((i) => !i.trim())) fail(`blank list item in "${p.title}"`);
    } else if (!b.text.trim()) {
      fail(`empty ${b.kind} block in "${p.title}"`);
    }
  }

  if (blocks.some((b) => b.kind === 'label')) withLabels += 1;
  if (blocks.some((b) => b.kind === 'list')) withLists += 1;
  if (blocks.some((b) => b.kind === 'paragraph')) withParagraphs += 1;
}

console.log(`  descriptions containing a label block : ${withLabels}`);
console.log(`  descriptions containing a list block  : ${withLists}`);
console.log(`  descriptions containing a paragraph   : ${withParagraphs}`);
console.log(`  total blocks produced                 : ${totalBlocks}`);

// 3. The parser must actually be finding structure — otherwise it is just a
//    passthrough and the whole exercise was pointless.
if (withLabels === 0) fail('no description produced a label block — the parser is not finding structure');
if (withLists === 0) fail('no description produced a list block — bullets are not being detected');

// 4. Behaviour on the shapes that matter, asserted explicitly.
const sample = `Given an array, print the indices.

Input
- Line 1: integer n
- Line 2: n integers

Output
Two indices.`;

const blocks = parseDescription(sample);
const kinds = blocks.map((b) => b.kind).join(',');
if (kinds !== 'paragraph,label,list,label,paragraph') {
  fail(`unexpected block sequence for the canonical shape: ${kinds}`);
}
const listBlock = blocks.find((b) => b.kind === 'list');
if (!listBlock || listBlock.kind !== 'list' || listBlock.items.length !== 2) {
  fail('canonical sample did not produce a two-item list');
}

const inline = parseDescription('Input: 5\nOutput: 15');
if (inline[0]?.kind !== 'label' || inline[1]?.kind !== 'code') {
  fail(`"Input: 5" should be label + code, got ${inline.map((b) => b.kind).join(',')}`);
}

const prose = parseDescription('Note: this works because the array is sorted.');
if (prose[1]?.kind !== 'paragraph') {
  fail(`a prose label value should stay a paragraph, got ${prose[1]?.kind}`);
}

if (parseDescription('').length !== 0) fail('empty input should produce no blocks');

console.log(`\n${failures === 0 ? 'PARSER OK' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
