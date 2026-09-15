# AlgoForge — Design Specification

**Current direction: Direction I · Pattern Studio** (selected 2026-09-13, implemented).
See §10 for the migration record. Direction H · Slate & Iodine, documented below, is
retained as history: the reasoning, the motion system and the engineering lessons all
still apply, but its palette and "measurement, not celebration" restraint are superseded.

---

## 10. Direction I · Pattern Studio (current)

**Why it replaced H.** H was coherent but read as accounting. The brief was explicit: a UI
that is *not AI slop*, that matches the product, with meaningful motion and a reason to
return. H's own bans (no gradients, no glows, no ambient animation) were kept — the change
is in **where the visual interest comes from**.

**The identity move: real algorithm structure carries the visual language.** The
dashboard's hero is the pattern the learner is actually on, drawn as an honest diagram of
that structure — indexed cells with a pointer pair for Two Pointers, a bracket for Sliding
Window, buckets for Hash Maps, and so on. The interest is intrinsic to the subject rather
than applied as decoration, which is what makes it not look generated.

### 10.1 Palette

| Token | Value | Role |
|---|---|---|
| `--af-ground` | `#19191b` | Graphite ground. One step above H's near-black. |
| `--af-surface` | `#222225` | Panels, cards, rows |
| `--af-surface-hi` | `#2c2b30` | Hover / nested |
| `--af-ink` | `#f1eeea` | Primary text (~14.7:1 on ground) |
| `--af-ink-soft` | `#b6b1ad` | Secondary (~8.2:1) |
| `--af-ink-faint` | `#8f8a85` | Metadata, still above the 4.5:1 floor |
| `--af-amber` | `#f0997d` | **Clay accent** — active, primary action, brand |
| `--af-teal` | `#b1cbbb` | **Mint** — success / completed |
| `--af-danger` | `#d98a76` | Failure. Softened clay-red. |
| `--af-ember` | `#c9542c` | **Drenched band** — the identity surface. Deeper than the accent: accent is for small marks, ember is for area. |
| `--af-ember-ink` | `#fdeee6` | Bone text on ember (~5.4:1) |
| `--af-cell-empty` | `rgba(244,237,230,0.16)` | Untouched sheet cell slot |

Token NAMES (`amber`, `teal`) were deliberately kept so the 29-file migration was a value
swap rather than a rename. New code should read them as *accent* and *success*.

Clay as text measures ~7.7:1 on the ground — better than H's amber, so contrast improved
across the board rather than being traded away for personality.

### 10.2 Typography

`DM Sans` is the body/UI face; `Space Grotesk` is the display face (headings, the pattern
name); `JetBrains Mono` carries code, figures and diagram annotations. Display tracking
stays at `-0.03em`, inside the −0.04em floor.

### 10.3 The two hero surfaces

**The identity band** (`Dashboard.tsx`). One drenched ember surface (`--af-ember`
`#c9542c`) — the only large saturated area in the product. It carries exactly three
things: how far you have come (`82 of 343 problems solved`), a bone progress rule, and
the single next action, named. Level, streak and rank sit underneath as small print.
The pattern diagram sits on its own ground-coloured plate inside the band, because the
diagram's contrast depends on the dark ground and cannot be re-tinted onto ember.

**The curriculum sheet** (`components/custom/CurriculumSheet.tsx`). The whole
curriculum on one sheet: every path, every topic, numbered in walk order, with each
topic's problems rendered as a **strip of cells** — outlined when untouched, filled in
their difficulty tone once solved.

The strip is the reason this screen is worth a second look: it is a real read-out. You
can see where your progress is dense and where it is thin, which no stat card can tell
you. It is deliberately informative rather than decorative, so it does **not** depend on
motion to be interesting — with all animation disabled the sheet still reads completely.

**Paths collapse.** A path with no progress starts collapsed, so a new learner opens the
sheet on the paths they have actually started instead of 313 empty cells. Step numbers are
assigned once, in curriculum order, so they stay stable as paths open and close. Any path
with progress is open by default.

**The plate steps.** When the active pattern has a stepper, the band's plate becomes an
interactive explainer — Back / Step / Run again, with the pattern's state actually moving
and every figure updating. Four are implemented, each driven by its own real algorithm:

| Pattern | What moves | Verified result |
|---|---|---|
| Two pointers | pointers, container, best area | largest container holds **49** |
| Sliding window | window bracket, left edge, longest run | longest substring is **3 characters** |
| Binary search | probe index, live range closing | **found 21 at index 10** in 4 probes |
| BFS | current node, queue, visited set | **all 7 nodes visited**, level by level |

Architecture: `components/custom/stepper/` — `traces.ts` holds the algorithms (pure,
React-free, the single source of truth), `Stepper.tsx` is the shared shell giving every
pattern one control vocabulary, `visuals.tsx` the chart bodies, and `index.tsx` the
dispatcher, which returns `null` for topics without a stepper so the caller falls back to
the static structural diagram rather than showing a mismatched animation.

**The steps are produced by running the real algorithm over the real input**, not authored
as an animation script — so the numbers on screen cannot drift from the truth, and a change
to the algorithm changes the explainer with it. The traces are asserted independently of
the UI by `app/scripts/check-traces.ts` (21 assertions, answers *and* invariants), run with
`node --experimental-strip-types app/scripts/check-traces.ts`.

**Reference principle, not a copy:** the numbered, progress-fractioned curriculum sheet
is takeUforward's proven structure; the dense scannable table is LeetCode's. The cell
strip and the stepping explainers are this product's own. Neither reference is imitated
visually — the ember band and the graphite ground are AlgoForge's own.

### 10.4 What was removed, and why

Three widgets were deleted rather than restyled: **Topic mastery**, **Continue learning**
and the earlier **feature panel**. All three reported the same per-topic progress as the
sheet, less completely, and two of them disagreed with each other about the same number.
A dashboard that says the same thing three ways reads as assembled, not designed.

### 10.5 Bug fixed during this work

**The landing page was the last H-era surface, and it contained a false claim.**

`Hero.tsx` led with a rotating typewriter headline ("Master [Algorithms | System Design |
…]") and a code window that typed out a `binarySearch` snippet over ~3 seconds. Both were
"watch it load" effects: a visitor waited to see code they could not interact with, and the
headline made the product indistinguishable from any other course site.

It is now a drenched ember band whose right-hand side is **the real binary-search
explainer** — a visitor can step through an algorithm before signing up. That demonstrates
the product instead of describing it.

`Features.tsx` was six identical icon + heading + text cards in a 3-column grid — the most
recognisable generated-layout pattern there is. It is now three panels of unequal size, two
of which render real components (the cell strip device, and a `PatternDiagram`).

`CTA.tsx` advertised **"500+ problems"** while `useStats()` exposes the real count. **A
landing page must not round a figure it has access to.** It now states the true number, and
its three trust pills were reduced to two — "Cancel Anytime" contradicted "Free Forever",
since you cannot cancel a free plan.

**Composition constraint:** the nav is `fixed` and transparent at the top, so an ember band
must begin *below* it. Nav ink on terracotta measures ~3.4:1 and fails.

### 10.6 Bug fixed during this work (data layer)

`getAllProblems` returned the raw API payload, which keys each problem's topic as
`topic_slug`. `Dashboard.tsx`, `UserHero.tsx` and `Problems.tsx` all filtered on
`topic_id`, which was therefore `undefined` — **every topic join silently matched
nothing.** The visible symptoms were "0 of 0 solved" topic tiles, a 0% mastery average,
and blank topic labels in the problem list.

Fixed at the single API boundary (`api/content.ts`, `withTopicId`) rather than in four
components, because the mismatch is a contract issue, not a component issue. The
normalisation is additive: `topic_slug` is preserved.

**General rule: when a join key is `undefined`, the failure mode is silence, not an
error. Verify that a join returns non-zero rows before trusting any UI that depends
on it.**

### 10.5 Migration scope

1,125 replacements across 28 files via an exact-string mapping script
(`app/scripts/migrate-pattern-studio.cjs`, idempotent — a second run makes zero changes).
`index.html` was migrated by hand (fonts + anti-flash skeleton). Verified: `tsc -b` clean,
production build clean, zero old-palette values remaining in `app/src`.

### 10.6 Verification

`app/scripts/verify-pattern-studio.cjs` creates a throwaway probe account
(`race-probe-visual@example.invalid`), drives the **real** API to build genuine progress,
then screenshots the dashboard, problem list and leaderboard in a real browser. Cleanup
reuses the project's own `cleanupProbeUsers.ts`, which matches only that email pattern and
deletes progress rows before the user.

Result: dashboard renders the active pattern ("Two Pointers.", 4/10 solved, diagram
present), no console errors, no horizontal overflow at 1440 or 390. Database restored to
32 users / 138 progress rows, zero probe accounts.

Screenshots: `design-mockups/ps-dashboard.png`, `ps-dashboard-mobile.png`,
`ps-problems.png`, `ps-leaderboard.png`.

### 10.8 The leaderboard

Rebuilt from a plain results table. Two things were wrong, not merely plain:

- **The time-range filter did nothing.** Three buttons set a `timeRange` state that was
  never sent; the backend's `getLeaderboard` accepts only `limit` and `sortBy`. Removed —
  a control that changes a word and no data is worse than no control.
- **"Your position" was hardcoded to "Unranked"** and never looked for the current user,
  while the board fetched only 10 of 32 users — so it usually could not have found them.
  The board now fetches the full list and locates the user, reporting their real rank and
  the exact gap to the place above.

**The design move: show the shape of each person's progress, not just their number.** Every
row carries a solved-of-total bar, so the table can be read by silhouette before any figure
is read — the same read-out principle as the curriculum sheet. The top three sit on the
ember band, the product's one drenched surface.

**Every row states the gap to the rank directly above it**, in the metric being sorted on.
It is the one genuinely actionable thing a leaderboard can offer, and almost none do it.
Ties render as **"tied"**, never `+0` — a zero gap printed as a number reads as a fault.

The bars immediately surfaced what the number-only table hid: sorted by XP, rank 1 had more
XP but *fewer solved problems* than rank 2 (37 vs 50).

### 10.9 The problem library

Rebuilt from a tall stack of loose rows into a **dense, scannable table** —
`[square toggle] [title + tags] [topic] [level] [actions]`, with a column header so the eye
can travel down one field at a time. 60px rows, down from ~80px. Reference principle:
LeetCode's problem table, which is the whole reason that page is usable at 3,000 rows.

The four stat cells became a **composition read-out** — a proportional bar in the three
difficulty tones plus per-band `solved/total` and a percentage. Four counts told you how
big the catalogue is; this tells you its shape and your position in it.

The completion toggle is now a **square that fills**, the same cell vocabulary as the
curriculum sheet, so solved state reads identically on both surfaces.

**Paginated at 50 per page.** Rendering all 343 rows cost **11,144 DOM nodes and a
21,311px page**; paging cuts that to **1,810 nodes / 3,655px** (−84%). The pager is centred
rather than spread, because the fixed AlgoBot launcher occupies the bottom-right corner and
made a right-aligned Next button unclickable.

### 10.10 The solving workspace

**The statement keeps its structure.** `problem.description` arrives as plain text with real
line structure — paragraphs, bare `Input` / `Output` labels, `- ` bullets. The workspace
rendered it with `whitespace-pre-wrap`, which discarded all of it **on the one screen where
the text IS the task**. `parseDescription.ts` (pure, React-free) now turns it into
label / paragraph / list / code blocks, and `ProblemDescription.tsx` renders them: labels
become small mono section headings, bullets a list with the square marker, and terse inline
values (`Input: 1 2 3`) monospace chips while prose values stay prose. Deliberately not a
markdown parser — the format is narrow and known, and a general parser would handle cases
that do not occur while risking the ones that do.

Verified against the **live catalogue**, not a sample: all 343 descriptions, 299 producing
label blocks, 299 list blocks, 1,539 blocks total, with a reassembly assertion proving
nothing is dropped (`app/scripts/check-description-parser.ts`).

Also added: the **reference links** the problem list already had (original problem,
walkthrough), and a **solved indicator** read from `UserProgress` — opening a finished
problem previously looked identical to opening a new one.

**Two bugs fixed:**

1. **Monaco's icon font was blocked by CSP.** `font-src` lacked `data:`, and Monaco bundles
   its codicon font as an inline base64 data URI — so the editor's icon glyphs never
   rendered. The same gap was in `app/vercel.json`, so this was broken in production too.
   A data-URI font is part of the bundle and cannot fetch third-party code, so allowing it
   does not weaken the policy; `img-src` already permitted `data:` on the same reasoning.

2. **The editor had zero height on mobile.** The workspace was `h-screen` with panes stacked
   below `md`, so Monaco was squeezed to nothing — you could not write code on a phone at
   all. Now `min-h-screen md:h-screen` so mobile scrolls, description capped at `50vh`.
   Note the trap: `min-h-[380px]` did *not* work, because **a percentage height resolves
   against the parent's `height`, and `min-height` does not establish one** — the wrapper
   measured 380px while the editor inside it stayed at 5px. A definite
   `h-[380px] md:h-auto md:flex-1` fixes it.

### 10.11 The profile

**A contradiction between two surfaces, fixed.** `getUserProfile` returned
`solved: user.solvedProblems?.length || 0` — the stale denormalisation this spec's own notes
warn against — while `getLeaderboard` counts `SOLVED` rows from `UserProgress`. The two
disagreed for the same person, so **clicking a leaderboard row opened a profile that
contradicted the row you clicked**. Measured before the fix: the board's #2 showed 37 solved,
their profile showed 0 (also true at #4 and #6). The endpoint now counts `UserProgress` and
takes `Math.max` against the array, mirroring the leaderboard exactly.

**One badge definition, not two.** The dashboard declared six badges with icon components;
the profile declared four different ones **with emoji** (🎯 ⚡ 🔥 ✨). They contradicted each
other — 10 solved earned "Rising Star" on one and "Problem solver" on the other. Both now
read from `utils/badges.ts`, and each badge carries a `requires` string so a **locked badge
states what it needs** ("A 3-day streak") instead of only being dimmed.

**Rank added**, by XP, and **labelled "Rank by XP"** — the orderings genuinely differ: by
solved the leader is one person, by XP another. An unlabelled rank would be a half-truth.

**Curriculum progress** added (`50/343`, "15% of every problem on the site"). "50 solved"
says little on its own; the bar says how much of the catalogue that is.

**A broken avatar image fixed.** The profile's `<img>` had no `onError`, so a dead URL — an
expired Google CDN link, or one blocked by `img-src` — rendered as a broken-image box with
the alt text spilling outside the frame. It now degrades to initials, with the failure flag
reset whenever the source changes so one dead URL cannot suppress every later one. The
leaderboard's avatar already guarded against exactly this; the profile did not.

### 10.12 Still open

- **Motion is implemented**: cell fill-in (staggered 14ms along a row), figure count-up,
  progress-rule draw, row reveal of the next problem, and four stepping explainers. A motion
  study showing the shell's motion, with a working reduced-motion toggle, is at
  `outputs/theme-shortlist/pattern-studio-motion.html`.
- **Four of eleven diagrammed patterns have a stepper.** Two pointers, sliding window,
  binary search and BFS are done. Candidates for the same treatment: DFS/backtracking,
  merge sort, and the DP table walk. Each must be driven by the real algorithm and added to
  `check-traces.ts`, never authored as an animation.
- **Hero / marketing surfaces** still carry H-era copy and layout; only tokens changed.
- **The `0 day streak` on a new user's first day** is the pre-existing
  `last_active @default(now())` issue from §9 item 8 — unchanged, still a product call.

---

# Direction H · Slate & Iodine (historical)

---

## 1. The scene sentence

A student at 11:40pm, room dark except the screen. They just got a submission
accepted. They are reading the runtime number, comparing it to their last attempt,
and deciding whether the optimization was worth it.

This forces three answers that the rest of the spec follows from:

- **Dark, genuinely.** Not dark as a style preference — dark because the room is dark.
  A light UI here is a flashbang at the moment of accomplishment.
- **The register is measurement, not celebration.** The student's next thought is a
  comparison, not a dopamine hit. The interface should feel like an instrument that
  reports, not a machine that cheers.
- **Numbers are the hero content.** Runtime, memory, streak, rank, complexity. The
  type system has to be built around figures first and prose second. This is the single
  most consequential decision in this spec.

The scene also tells us what to *avoid*: the "casino" reading. Leaderboards and streaks
must feel like a ranked results table, not a slot machine.

---

## 2. Why H, and what it refuses

**What it refuses:** the reflex dark theme. Every dark dev tool defaults to blue-black
(`#0a0a0f`, `#111827`, anything Tailwind-slate) with a violet or cyan accent. That is
what AlgoForge looks like today, and it is the single strongest signal that nobody made
a choice.

**The two commitments that make H different:**

**Commitment 1 — the ground is warm mineral, not blue.**
`#101113` is a charcoal with a faint warm cast, not a hue-tinted blue. This is subtle in
a swatch and unmistakable on a full screen. Warm charcoals read as *slate stone, anodized
metal, dark room*; blue-blacks read as *software default*. Almost nobody ships a warm
dark ground, which is precisely why it doesn't look generated.

**Commitment 2 — status is expressed as solid fills, not outlined chips.**
The signature move. Where most dark UIs use a 1px outline plus a tinted text label
(which reads as timid and washed out on dark), H fills the block solid with the accent and
puts dark text on top. This is the inverted-chip pattern. It gives the interface authority,
and it means accent color is doing structural work rather than decoration.

**Corollary — status colors are mode-inverted.** Amber/teal on dark ground would fail
contrast as text. They are used two ways: as *fills* for blocks (with dark ink on top), and
as *brightened variants* when they must be text. The brightened values are separate tokens;
do not reuse the fill value as a text color.

---

## 3. Color

Strategy: **Committed.** Two accents, both carrying assigned meaning. Neutrals are warm.

All values below are the shipped hex (this project's `index.css` uses HSL triplets, so
the build step must convert — see §3.3).

### 3.1 Core tokens

| Token | Hex | HSL triplet | Role |
|---|---|---|---|
| `--af-ground` | `#101113` | `220 5% 7%` | Page ground. Warm charcoal. |
| `--af-surface` | `#1A191C` | `270 5% 11%` | Panels, cards, raised rows. |
| `--af-surface-hi` | `#232225` | `270 4% 14%` | Hover / active surface, nested panels. |
| `--af-rule` | `rgba(234,231,225,0.10)` | — | Hairline dividers. Warm-tinted, not gray. |
| `--af-rule-strong` | `rgba(234,231,225,0.20)` | — | Header rules, table borders, focus rings. |
| `--af-ink` | `#EAE7E1` | `40 18% 90%` | Primary text. Warm off-white, never `#fff`. |
| `--af-ink-soft` | `#8A857C` | `37 6% 51%` | Secondary text, metadata. |
| `--af-ink-faint` | `#6B665E` | `37 6% 39%` | Timestamps, disabled. **Contrast floor.** |

### 3.2 Accents

| Token | Hex | Meaning | Use |
|---|---|---|---|
| `--af-amber` | `#E0A33E` | Dominant accent. Warning / in-progress / active / brand. | Solid fills, active nav, primary button, progress bars |
| `--af-amber-ink` | `#F0C674` | Amber as **text** (lightened for contrast) | Amber text on dark ground |
| `--af-amber-wash` | `rgba(224,163,62,0.14)` | Amber at low alpha | Active-row background, selected state |
| `--af-teal` | `#5FB8A6` | Counter accent. Success / passed / completed / correct. | Solid fills, test pass indicators |
| `--af-teal-ink` | `#7FD6C2` | Teal as **text** | Passed labels, `accepted` states |
| `--af-teal-wash` | `rgba(95,184,166,0.14)` | Teal at low alpha | Passing-row background |
| `--af-danger` | `#D9634F` | Failure / wrong answer only. **Not** a third brand color. | Failed tests, errors |

**The discipline rule:** amber and teal are *states*, not decoration. If an element isn't
communicating "active/warning" (amber) or "success/passed" (teal), it stays neutral. A screen
with no state to report should be entirely neutral. This is what keeps the palette from
becoming confetti.

**`--af-danger` is deliberately restrained** — a desaturated terracotta rather than a
saturated red, so a failed test reads as information rather than alarm.

### 3.3 Naming note (build constraint)

The existing build maps tokens as `hsl(var(--token))` in `tailwind.config.js`, and
`index.css` stores bare HSL triplets. Two options:

- **Preferred:** keep the triplet format for compatibility, but define the new tokens
  alongside. The triplets in the tables above are already in that format.
- Alpha values (`--af-rule`, washes) can't live as triplets — define them as full
  `rgb()`/`rgba()` values and set them directly rather than through the Tailwind color map,
  or register them as separate non-mapped custom properties.

### 3.4 Contrast targets (verify at build)

Measured on `--af-ground` `#101113`:

- `--af-ink` → target **≥ 14:1**
- `--af-ink-soft` → target **≥ 6:1**
- `--af-ink-faint` → target **≥ 4.5:1** (hard floor — this replaces the current
  `text-white/30`, which fails)
- `--af-amber` as a **fill** with `--af-ground` text on top → target ≥ 7:1
- `--af-teal` as a **fill** with `--af-ground` text on top → target ≥ 7:1
- `--af-amber-ink` / `--af-teal-ink` as text on ground → target ≥ 4.5:1

> The current build's `--muted-foreground: 0 0% 92%` is near-white and is the root cause
> of the "everything looks the same weight" problem. The three-step ink ramp here replaces
> it with actual hierarchy.

### 3.5 What this deletes

- `#a088ff` violet — **removed** (currently the primary accent across ~23 files)
- `#63e3ff` cyan — **removed**
- `#fa6a20` ember / `#ffae62` — **removed**; amber absorbs this role
- `#00f0ff` `--forge-cyan` — **removed**
- `--forge-ember` / `--forge-purple` custom properties — **removed**
- Difficulty colors (`#7ca700` / `#ffc107` / `#ff6347`, or the `#...20` alpha fills) —
  re-derived: Easy → `--af-teal`, Medium → `--af-ink-soft`, Hard → `--af-danger`.
  Expressed as the 3px row edge, never as a text color alone.

**Migration consequence:** this is a genuine breaking change. Every file referencing
`--primary`, `#a088ff`, `#fa6a20`, `.glass`, `.gradient-text`, or `.doppelrand-shell`
touches this work. That inventory should be taken before implementation starts.

---

## 4. Typography

Two families plus a mono, all selected against the reflex-reject list. **No serif** — that
was the Lab Notebook proposal and it does not belong in a dark instrument register.

**Display / UI — Space Grotesk.** Technical, slightly quirky, excellent at large sizes with
tight tracking. Reads as engineering rather than marketing. Already loaded in the current
build, so no new font cost.

**Mono — JetBrains Mono.** For code, test output, timestamps, runtime/memory figures, and
problem slugs. **Currently referenced in CSS but never actually loaded** via `index.html` —
that silent-fallback bug is fixed as part of this work.

**No third family.** Prose uses Space Grotesk at body size. Adding a text face here would
dilute the instrument register.

### Scale

Ratio ≥ 1.25, fluid via `clamp()`.

| Step | Size | Use |
|---|---|---|
| `display` | `clamp(2.5rem, 5.5vw, 4.5rem)` | Hero only. Max ≤ 5rem. |
| `h1` | `clamp(1.75rem, 3vw, 2.5rem)` | Page titles |
| `h2` | `clamp(1.25rem, 2vw, 1.75rem)` | Section |
| `h3` | `1.125rem` | Panel / card titles |
| `figure` | `1.5rem` | Stat values. **Its own step.** |
| `body` | `0.9375rem` / 1.6 | Prose. Cap at 68ch. |
| `small` | `0.8125rem` | Metadata |
| `micro` | `0.75rem` | Labels. Floor — nothing below 12px. |

**Tracking:**
- `display`: `-0.03em`. The current build's `-0.05em` (Hero) is cramped past the floor.
- `h1`/`h2`: `-0.015em`
- body: `0`
- `micro` labels: `+0.06em` — **if and only if the label is genuinely a label.** The
  ubiquitous tiny uppercase tracked eyebrow above every section is a named slop marker;
  do not introduce new ones.

**Numerals — the important part.** Every figure gets
`font-variant-numeric: tabular-nums`. This applies to: runtime, memory, attempt counts,
streak, XP, rank, timer, problem counts, and every percentage. On a dark UI where figures
are the hero content, non-tabular numerals are immediately visible as jitter during count-up.
**This is non-negotiable in a direction whose thesis is "numbers are the hero."**

---

## 5. Layout & surfaces

### 5.1 Structure

- **Hairlines and solid fills, not outline-plus-shadow.** The signature pattern is either a
  hairline rule or a solid muted surface. The current build's habit of `1px border + wide soft
  shadow` is a named slop marker and is removed.
- **Rules:** `--af-rule` for dividers between related rows; `--af-rule-strong` for section
  boundaries and table headers.
- **Radius:** 6px on panels and cards, 4px on inline controls, 10px on the one modal.
  **Never 2rem.** Currently `.doppelrand-shell` uses `border-radius: 2rem` — removed.
- **No glass.** `.glass` / `.glass-light` and decorative `backdrop-filter` — removed. Glass
  on a warm-charcoal ground is meaningless and it is a default AI move.
- **Squares, not circles.** Small status marks are squares (4px radius), not dots or pills.
  Circles read as consumer app; squares read as engineering documentation. This applies to
  status marks, difficulty edges, and legend swatches.

### 5.2 Spacing

- Vertical rhythm in `rem` (0.5 / 1 / 1.5 / 2 / 3), component-internal gaps in px (8/12/16).
- Dense by default. This is a tool that shows a lot of rows. Generous whitespace is a
  marketing-page virtue, not an app virtue here.
- `text-wrap: balance` on h1–h2, `text-wrap: pretty` on prose.

### 5.3 Z-index

Semantic scale, replacing arbitrary `9999`:

```
--z-base: 0; --z-sticky: 10; --z-dropdown: 20;
--z-overlay: 30; --z-modal: 40; --z-toast: 50;
```

### 5.4 The status-fill system (signature)

Where H differs from every other dark theme:

- **Status blocks** — solid accent fill, `--af-ground` text on top, 8px radius, no border.
  Used for: pass/fail summaries, difficulty-typed figures, achievement chips, roadmap
  milestones. **Max 2-3 per screen** or the "solid means important" signal dies.
- **State rows** — the accent appears as a 3px left edge on the row plus a washed background
  (`--af-*-wash`). Used for: active problem, passing test case, current roadmap step.
- **Never** use a solid fill for something that isn't a state. A decorative amber button
  next to a status amber button destroys the whole system.

---

## 6. Motion

Governed by the frequency test. Most of this product is used daily, so **most motion
disappears.**

| Element | Frequency | Decision |
|---|---|---|
| Nav, tabs, buttons, filter chips | 100+/day | No entrance animation. Press feedback only. |
| Problem list rows | tens/day | No stagger. Instant. |
| Modal / drawer | occasional | 200ms, custom ease-out. |
| Test-run results appearing | per submission | Short stagger (~40ms), teal/amber fading in. Earns it — it's the payoff moment. |
| Note save confirmation | occasional | Small, calm, no toast stack. |
| Streak milestone / level-up | rare | Earns real delight. The one place for a bigger gesture. |

- **Easing:** `cubic-bezier(0.23, 1, 0.32, 1)`. No bounce, no elastic, no spring overshoot.
- **Durations:** press 120ms; popover 150ms; modal 200ms; nothing above 300ms.
- **Press feedback:** `transform: scale(0.98)` on `:active` for every pressable element.
- **Enter states:** never `scale(0)`. Use `scale(0.97)` + opacity.
- **Reduced motion:** every transform animation gets a
  `@media (prefers-reduced-motion: reduce)` crossfade alternative.

### Removed outright

- Two blurred gradient orbs drifting on an infinite loop (Hero). Blur-on-dark also produces
  visible banding, so this is both a slop marker and a rendering defect.
- `animate-pulse` permanently on the nav XP flame → pulses only on streak change.
- `animate-float`, `animate-pulse-glow`, `animate-shimmer` — decorative, removed.
- Route-transition `y: 20 → 0` fade on every navigation (adds perceived latency).
- Gradient text on headings — removed; on a dark ground it washes out badly.

### Added

- **Count-up on figures** — respects the "numbers are the hero" thesis. Uses rAF, snaps
  instantly under `prefers-reduced-motion`. Must use tabular numerals or it looks broken.
- **Live status transitions** — when a test flips pending → passed, the 3px edge and wash
  animate over 150ms. This is the one motion that carries information rather than decoration.
- **Focus rings** — `--af-rule-strong` outline with 2px offset. Currently missing on
  icon-only buttons (which also lack `aria-label`s — fix both together).

### 6.1 The implemented motion system

The table above is the *policy*. The *implementation* lives in `index.css` as a small,
documented set of tokens and helper classes. Five rules govern everything in it:

1. **Frequency test.** Anything visible 100+ times a day gets no entrance animation —
   press feedback only.
2. **One-shot only.** Nothing loops, except honest "still working" signals (the skeleton
   pulse). A loop that isn't conveying work is decoration.
3. **120–240ms.** Press is 90ms; hover/focus/colour is 140ms; a row settling is 200ms;
   overlays get 320ms. Nothing longer.
4. **Only `transform` and `opacity` animate.** No animating `width`, `height`, `top`,
   `left`, or `background-position` — those trigger layout.
5. **Every rule has a reduced-motion fallback**, enforced globally rather than per-rule.

Tokens: `--af-ease-out`, `--af-ease-in-out`, `--af-ease-spring` (used *only* for the
toggle confirmation, where a small overshoot is honest feedback), `--af-dur-instant`
(90ms), `--af-dur-fast` (140ms), `--af-dur-base` (200ms), `--af-dur-slow` (320ms),
`--af-stagger-step` (22ms).

Helper classes, and when to use each:

| Class | Use for | Feedback |
|---|---|---|
| `.row-interactive` | A ruled list row (problems, leaderboard, forum posts) | Background wash to `--af-surface` on hover, `--af-surface-hi` on press |
| `.row-actions` | The trailing action cluster in a row | Fades in on row hover/focus. Always visible on touch |
| `.icon-btn` | A bare icon control (edit, delete, close) | Background wash + `scale(0.92)` on press |
| `.tile-interactive` | A clickable card/tile (roadmaps, dashboard topics) | Steps *up* to `--af-surface-hi`; hairline strengthens; `scale(0.995)` on press |
| `.chrome-btn` | Toolbar/pagination/refresh controls | Brightens to `--af-surface-hi`, `scale(0.94)` on press |
| `.enter-rise` / `.stagger` | One-shot entrance for genuinely new content | 4px lift, 22ms per-child delay, capped at 8 children |
| `.skeleton` | Loading placeholder | Flat opacity pulse, dimmed so it sits *below* real content |

**The trap worth documenting** (found by verification, not by eye): `.tile-interactive`
must hover to `--af-surface-hi`, **not** `--af-surface`. A tile already rests *on*
`--af-surface` — that is the fill we give it — so washing it to the same token is a
no-op. Only rows that rest on transparent can hover to `--af-surface`. This is exactly
the kind of bug a screenshot cannot show you: the CSS is valid, both rules match, the
hover rule wins the cascade, and nothing happens.

---

## 7. Components to rebuild

Small set, done properly, rather than 56 half-used shadcn primitives.

1. `Panel` — hairline-ruled surface (replaces `.glass`, `.doppelrand-shell`)
2. `Button` — 3 variants: primary (solid amber + ground text), secondary (ink outline),
   quiet (text). Danger variant reuses `--af-danger`.
3. `StatFigure` — tabular numeral + label. No card, no glow.
4. `RuledRow` — list item on a hairline (problem rows, leaderboard)
5. `StatusBlock` — the signature: solid accent fill, ground text, no border
6. `StateRow` — hairlines + 3px accent edge + wash
7. `TestResult` — mono line with pass/fail state in `--af-teal-ink` / `--af-danger`
8. `Field` — input with a hairline underline, not a boxed input
9. `Tag` — square corners, hairline outline (replaces pill badges)
10. `LogLine` — mono timestamp + verb, the ledger register

---

## 8. Proof of concept

First pass delivers tokens plus **two surfaces**, chosen to prove both registers and to
test the riskiest assumption (**that austere dark holds up where gamification lives**):

- **Problems list** (app register) — proves the ink ramp, tabular numerals, density, the
  difficulty-as-edge system, and the rule structure under real data.
- **Leaderboard** (the hard case) — proves the palette can carry a competitive, celebratory
  screen without either looking like a casino or collapsing into gray. This is the surface
  most likely to kill the direction, so it goes first.

If those two hold, everything else is applying the same tokens.

**Explicitly deferred:** the Hero. Marketing is the least risky surface and the least
informative test of whether a dark instrument register works.

**Outcome — both held, and the sweep is complete.** Verified in a real browser from a
production build (`VITE_SHOW_FIXTURES=1 npx vite build` → `vite preview` → Playwright), because
the project's `script-src 'self'` CSP blocks the dev-server HMR preamble. Screenshots in
`design-mockups/`.

- **Leaderboard** — the hard case passed. Hairline rows, right-aligned tabular figures, square
  avatars, amber rank marks for the top three only, totals footer. No podium, no medals, no
  celebration, and it still reads as competitive rather than gray.
- **Problems list** — held. Difficulty carried as a 3px row edge plus a text label, never a
  filled pill.

Two things worth recording as corrections to earlier assumptions:

- **The Hero was built anyway and is fine**, so the deferral cost nothing.
- **A suspicion that was wrong, and would have been a regression had I acted on it.** The
  Dashboard appeared to have two data bugs (difficulty counts stuck at `0/7`, streak stuck at
  `0`). Reading the backend first showed both were artifacts of my own review fixture: the API
  uses title-case `Easy` / `Medium` / `Hard` throughout, and `dashboard-stats` really does
  return `currentStreak`. The components were correct. **Check the backend contract before
  editing a component that merely looks wrong.**
- **One real bug did surface:** a hardcoded `<span>0%</span>` in the Topic mastery legend that
  contradicted its own tiles, replaced with a derived average. On a spec whose thesis is
  "numbers are the hero content," a decorative number is the worst possible defect — which is
  the argument for reviewing rendered output rather than trusting that `tsc` passed.

---

## 9. Resolved and open questions

**Resolved:**

1. **Light or dark** → dark-only, committed. No light counterpart, no toggle. The existing
   `next-themes` dependency and the `darkMode: ["class"]` config become unnecessary.
2. **Direction** → H · Slate & Iodine.
3. **Accent consolidation** → amber absorbs ember; the violet/cyan system is deleted.
   One accent family, one meaning map.
4. **Serif** → no. Rejected for this register.
5. **Migration scope** → **clean sweep, and it is done.** All 97 files assessed; 28 migrated.
   Zero legacy color or class references remain in `app/src`. The only surviving grep hits are
   comments documenting what was deleted. To be clear about the blast radius measured up front:
   `#fa6a20` / `#ffae62` / `#00f0ff` returned **zero files** — the ember tokens in `index.css`
   were dead custom properties with no consumers, so "amber absorbs ember" cost nothing.
6. **The competitor sentence test** → adopted as written. The instrumentation framing is the
   positioning, not just the visual style.
7. **Motion depth** → **the user chose to deepen H rather than replace it.** When the request
   came in for a more interactive, animated feel, the conflict with H's own bans (no gradients,
   no glows, no ambient animation) was raised explicitly rather than resolved silently. The
   decision: keep H's palette and restraint, add genuine *interaction craft* underneath. Motion
   serves feedback, never decoration. Implemented as §6.1 across all 12 surfaces, and verified
   by reading computed styles at each state rather than by eye.

**Open:**

1. **Streak flame.** The current nav flame is an ember-colored icon with a permanent pulse.
   Under H it should be amber and pulse only on change — but is a flame still the right
   metaphor for a warm-charcoal instrument register? A simpler counter may be more honest.
   **Status:** the permanent pulse has been removed (it was an infinite animation, banned by §6).
   The icon itself is still a `Flame` in amber. Leaning toward keeping it — a streak is the one
   place where a degree of warmth is earned rather than decorative, and the alternative (a bare
   number) loses the affordance that this figure measures a run. Flagging for a decision rather
   than deciding silently.
2. **Fixture removal — investigated, and the original concern was wrong.** This item previously
   said fixtures "must be deleted once the API is live in every environment, or they will mask a
   real outage as 'working, just showing sample data.'" That risk does not exist in the code.
   Only two files carry fixtures (`Leaderboard.tsx`, `Problems.tsx`), every use site is guarded
   by `SHOW_FIXTURES` (`import.meta.env.DEV || VITE_SHOW_FIXTURES`), and the else-branch is an
   explicit `setErrored(true)` — so a production outage surfaces as a real error state, not as
   sample data. All three covered endpoints (`/api/users/leaderboard`, `/api/content/problems`,
   `/api/content/topics`) are live and returning 200.
   **Decision: keep them.** They are a correctly-guarded dev-only review affordance, and the
   only way these surfaces render without a backend. The rule they encode is worth keeping
   explicit: *a fixture may fill a settled-empty state, never a loading state* — violating that
   is what made the Problems skeleton unreachable (§8).
3. **Malformed route ids — fixed, was a real defect.** Previously recorded here as a "dead
   `/api/forum/posts` route." That diagnosis was wrong: the route list has `router.get('/:id')`,
   so `posts` simply matched the id param. The real bug was that Prisma + MongoDB **throws**
   `P2023` on a malformed ObjectId rather than returning null, and the controllers' catch-all
   turned it into **500** — a server error for a plain client mistake, with a full stack trace
   logged per request. 21 call sites across `forumController` and `adminController` were
   affected. Fixed with a single `rejectInvalidId()` guard (`backend/src/utils/idGuard.ts`)
   applied at 12 handler entry points; malformed ids now 404, valid ids are unaffected, and the
   error log is clean. **General rule for this codebase: validate any route id before it
   reaches Prisma — `findUnique` is not a safe existence check on an ObjectId field.**
4. **The schema's `@unique` constraints are not enforced in the database — systemic.**
   `prisma/schema.prisma` declares five unique constraints and two indexes; the live MongoDB
   database has **none of them**. Every collection carries only the default `_id_` index.
   On MongoDB, Prisma's `@unique` is only a *declaration* — enforcement lives in a real index,
   created only by `prisma db push`/`migrate`, which was never run. So the schema's uniqueness
   guarantees are documentation, not protection.
   **Two live violations, one root cause:** `User.email` and `User.googleId` each have a
   duplicate pair — the same two documents, i.e. one person with two signups (Feb 2026 by
   password, May 2026 by Google), both on the same Google identity. Both appear on the
   leaderboard. No violations exist in `Topic.slug`, `LearningPath.slug`, or `UserProgress`,
   so those indexes can be created immediately.
   **Read-only audit added:** `backend/src/scripts/auditConstraints.ts` — run it to see
   declared-vs-enforced and any violations; exits non-zero when dirty.
   **Partially fixed:** the five indexes whose data was verified clean have been created
   (`src/scripts/createIndexes.ts`): `Topic.id_unique`, `LearningPath.id_unique`,
   `UserProgress.user_id_problem_id_unique`, and two `ForumPost` performance indexes. Audit
   went 7 problems → 4. **Gotcha:** `Topic.slug`/`LearningPath.slug` are `@map("id")`, so the
   real index is on the DB field `id`, not `slug` — indexing `slug` would have been silently
   useless, and my first audit script reported a false negative for exactly that reason.
   **Resolved by merge.** The duplicate account was the owner's own two signups, and the two
   documents held **disjoint** progress (43 solved / 6 notes / 5 bookmarks / the only password
   hash on the older one, 7 solved on the newer). Deleting either would have destroyed data that
   existed nowhere else, so they were merged onto the newer Google account rather than pruned
   (`src/scripts/mergeDuplicateUser.ts`, dry-run by default, `--apply` to execute, JSON backup
   written first). Result: 46 `UserProgress` rows re-pointed, `solvedProblems` 7 → 50,
   bookmarks 2 → 7, XP 175 → 1,250, streak 1 → 2, password hash carried over, old document
   deleted, users 33 → 32. All seven declared indexes are now created and `auditConstraints.ts`
   reports **0 problems** with all five constraints ENFORCED.
   **Index-construct trap worth remembering:** the `User.googleId` unique index must be
   **`sparse: true`**, not a `partialFilterExpression`. A filter containing `$type` cannot be
   round-tripped by Prisma's Extended-JSON deserializer, so `listIndexes` throws
   *"Unknown tagged value"* and the **whole collection becomes unreadable** through Prisma
   introspection — it silently masqueraded as "no indexes" until diagnosed. `sparse` is a plain
   boolean and round-trips cleanly. `auditConstraints.ts` now surfaces that error instead of
   swallowing it.
   Also worth knowing: `authController.ts:27` is a check-then-insert **TOCTOU race** — see item 6.
5. **Leaderboard "solved" was wrong for 30 of 33 users — fixed.** The column read the
   denormalised `solvedProblems` array on the User document instead of the `UserProgress`
   collection. Only 3 of 33 users had a populated array, so both top scorers displayed
   "0 solved" while actually having 37 and 43. `getLeaderboard` now counts `SOLVED` rows via
   a `$lookup` (with `$max` against the array so a legacy document is never undercounted).
   Verified: every wrong row corrected, correct rows unchanged, all three sort modes intact.
   **General rule: `UserProgress` is the authoritative record of what a user has solved —
   treat `User.solvedProblems` as a stale denormalisation and never read a count from it.**
6. **The signup TOCTOU race — fixed, and the index *created* the bug's final form.** This is
   a follow-on from item 4, not a separate defect: `registerUser` and `googleAuth` both guard
   their insert with a `findUnique` pre-check, which is check-then-insert and therefore racy.
   Two concurrent requests can both pass the check and both insert.
   Before the unique indexes existed, that silently produced **duplicate accounts** — which is
   exactly how the duplicate pair in item 4 came to be. After the indexes were created, the
   race changed shape rather than disappearing: the losing insert now raises a Prisma
   unique-constraint violation (**P2002**), which the controllers' catch-all turned into a
   **500**. So creating the index without touching the controllers would have traded silent
   data corruption for a server error — a predictable, benign race reported as a server fault.
   Fixed in `authController.ts` via `utils/prismaErrors.ts`:
   - `registerUser` returns the same **400 "User already exists"** the pre-check would have
     given, so the race is invisible to the client and the contract is unchanged.
   - `googleAuth` **recovers** instead of erroring — it re-reads the row the winner wrote and
     continues. A sign-in must be idempotent; signing in twice is not an error.
   **Verified with `backend/scripts/probe-signup-race.cjs`:** 6 simultaneous signups on one
   fresh email produce exactly one `201`, five `400`s, and **zero `500`s**; an existing email
   still returns `400`. Probe accounts are removed afterwards by
   `src/scripts/cleanupProbeUsers.ts`, which matches on `race-probe-*@example.invalid` *and*
   refuses to delete any account that has progress rows.
   **General rule: a pre-check before an insert is never a guarantee — always handle the
   unique-violation the insert itself can raise, and pick the semantics deliberately
   (reject for registration, recover for sign-in).**
7. **Progress endpoints had the same race, and there it inflated XP — fixed.** The same
   check-then-insert shape appeared three more times in `userActionController.ts`
   (`updateProblemStatus`, `toggleBookmark`, `updateNotes`), all keyed on the
   `user_id_problem_id` compound unique. Creating `user_id_problem_id_unique` in item 4 put
   them all on the P2002 → 500 path, so they were fixed together.
   `toggleBookmark` genuinely cannot use `upsert` — a toggle's new value depends on the value
   read — so it keeps the read and recovers from P2002 by re-reading the row the winner wrote.
   `updateNotes` and `updateProblemStatus` needed no pre-read at all.
   **The XP bug this exposed is the more serious half.** `updateProblemStatus` read the
   current status, wrote the new one, *then* decided whether to award XP. Under concurrency
   every request reads the same pre-transition value and concludes "this is a real
   transition" — measured: **six concurrent `SOLVED` writes awarded 150 XP instead of 25**.
   The old 500s had been *masking* this, because five of the six requests died before
   reaching the XP code; making them all succeed made the race reachable. A user double-
   clicking a problem could multiply their XP.
   Fixed by letting the database decide: one conditional `updateMany` whose filter encodes
   the XP-bearing transition (`status: { not: 'SOLVED' }` when moving into solved,
   `status: 'SOLVED'` when moving out). `updateMany` returns the number of documents it
   changed, which is exactly the "did *this* request perform the transition?" signal — and
   unlike a read, it cannot be observed by two requests at once. Exactly one concurrent
   request can match; the rest match zero rows and award nothing.
   **Verified by `backend/scripts/probe-status-transitions.cjs` — 11/11 assertions**, covering
   the full matrix: `TODO→SOLVED` +25, `SOLVED→SOLVED` +0 (a re-save must not double-award),
   `SOLVED→TODO` −25, `TODO→ATTEMPTED` +0, `ATTEMPTED→SOLVED` +25, six concurrent `SOLVED`
   writes +25 exactly once, invalid status → 400, exactly one row per problem, and no
   duplicates in `solvedProblems`. Plus `probe-progress-race.cjs` for the endpoint-level race.
   **General rule: when a decision depends on the value being changed, do not read-then-write
   — encode the condition in the write's filter and use the affected-row count as the answer.**
8. **Streak is stuck at 0 for a new user's entire first day — found, not fixed.** Surfaced
   while verifying item 7. `User.last_active` is `DateTime @default(now())`, so a
   freshly-registered user *already* has `last_active` set to today. On their first solve the
   streak logic therefore takes the "same day — streak unchanged" branch and leaves
   `streak_days` at 0. It only becomes 1 on the following calendar day.
   The consequence for the code itself: the documented rule 4 in that handler —
   *"If no last_active (new user) → streak starts at 1"* — is **unreachable dead code**,
   because `last_active` is never null. The comment describes an intent the code cannot fulfil.
   **Not changed, deliberately.** It is pre-existing, unrelated to the index work, and it is a
   product-semantics question rather than a defect with one obvious answer: it decides what a
   streak *means* on day one, and it is visible in both the leaderboard's streak column and the
   nav flame. Two candidate fixes, for a decision rather than a silent pick:
   (a) treat "no prior solve" (empty `solvedProblems` / `activityLog`) as a new streak rather
   than "no `last_active`"; or (b) stop defaulting `last_active` at registration, so it means
   "last solved" rather than "last seen" — which changes existing rows' meaning. Flagged for a
   decision.
