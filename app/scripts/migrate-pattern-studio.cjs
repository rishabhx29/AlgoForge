'use strict';
// One-shot migration: Direction H (Slate & Iodine) → Pattern Studio.
// Exact-string replacements only. Idempotent: a second run changes nothing.
// Touches all .tsx/.ts/.css under app/src — NOT index.html (migrated by hand).
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Rishabh/AlgoForge/app/src';

// H value → Pattern Studio value. Token NAMES are unchanged; only values move.
const MAP = [
  // Core ramps
  ['#101113', '#19191b'], // ground
  ['#1a191c', '#222225'], // surface
  ['#232225', '#2c2b30'], // surface-hi
  ['#eae7e1', '#f1eeea'], // ink
  ['#8a857c', '#b6b1ad'], // ink-soft
  ['#6b665e', '#8f8a85'], // ink-faint
  // Accent family (amber token → clay value)
  ['#e0a33e', '#f0997d'], // accent fill
  ['#f0c674', '#f5b8a3'], // accent ink
  ['#eab04f', '#ffb197'], // accent hover
  // Success family (teal token → mint value)
  ['#5fb8a6', '#b1cbbb'], // success fill
  ['#7fd6c2', '#c8dfd1'], // success ink
  // Danger family
  ['#d9634f', '#d98a76'], // danger fill
  ['#e88b78', '#e8a795'], // danger ink
  // Code token
  ['#c9a276', '#cf9d85'],
  // Alpha literals (ink-based rules, accent washes)
  ['rgba(234,231,225,', 'rgba(241,238,234,'],
  ['rgba(224,163,62,', 'rgba(240,153,125,'],
  ['rgba(95,184,166,', 'rgba(177,203,187,'],
  ['rgba(217,99,79,', 'rgba(217,138,118,'],
];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC, []);
let touched = 0;
let totalReplacements = 0;
const perFile = [];

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  let count = 0;
  for (const [from, to] of MAP) {
    let idx = after.indexOf(from);
    while (idx !== -1) {
      after = after.slice(0, idx) + to + after.slice(idx + from.length);
      count++;
      idx = after.indexOf(from, idx + to.length);
    }
  }
  if (count > 0) {
    fs.writeFileSync(file, after);
    touched++;
    totalReplacements += count;
    perFile.push(`${path.relative(SRC, file)}: ${count}`);
  }
}

console.log(JSON.stringify({ filesScanned: files.length, filesChanged: touched, totalReplacements, perFile }, null, 2));
