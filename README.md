# Design Stack for Claude Code

A curated, non-conflicting set of design skills plus one orchestrator skill
(`design-director`) that interviews you into a brief and then tells Claude which
skill to use at each step, and a design gate whose hooks make every one of those
steps mandatory. Everything is vendored: `install.sh` works offline.

## Why your output looks like AI slop

Claude's default UI is the statistical average of every site it has seen:
centered headline, eyebrow label, three icon cards, soft purple gradient, Inter,
bounce easing. Slop is not a model problem, it is a *decision* problem: nothing
on the page was chosen. The fix has four parts, in this order:

1. **A real brief** (subject, audience, references, what is forbidden). The director
   gets it out of you in two rounds of questions and writes `DESIGN-BRIEF.md`.
   Ten minutes here is worth more than any skill.
2. **One taste skill per job**, never three fighting each other.
3. **A critique and audit loop** that runs before you accept the result.
4. **A gate that holds the order.** A skill is prose, and a model in a hurry skips
   prose. The gate's hooks refuse UI work until you approve the brief and the
   direction, and check the finish after every change.

## The stack (what's in, what's out, and why)

| Layer | Skill | Use for | Why this one |
|---|---|---|---|
| Taste: marketing pages | `design-taste-frontend` (Leonxlnx/taste-skill v2) | Landing pages, portfolios, product pages, one-pagers, heroes | Art direction drawn from a library of 247 Awwwards / One Page Love sites, hard "no slop" house rules, real-browser screenshot loop. Explicitly *not* for dashboards. |
| Taste: product UI | `impeccable` (pbakaus/impeccable 4.6) | Apps, dashboards, settings, forms, anything with state | 24 commands (`critique`, `polish`, `animate`, `audit`, `bolder`, `quieter`…), a deterministic slop detector, and a hook that re-scans every UI file you edit. Started from Anthropic's `frontend-design` and supersedes it. |
| Motion: decisions | `animate` (delphi-ai, from Emil Kowalski's course) | What moves, how long, which easing; exit animations; `prefers-reduced-motion` | Correct easing/duration tables. Small and opinionated. Also carries React examples when no library is wanted. |
| Motion: implementation | `motion` (Motion AI Kit, motiondivision/ai-kit) | Writing the animation in Motion / framer-motion / motion-v, or a CSS `linear()` spring | Hand-written best practices by Motion's author for React, Vue, vanilla, Base UI and Radix; works with no server. Free MCP server searches the current Motion docs. |
| Motion: scroll / cinematic | `gsap-framer-scroll-animation` (github/awesome-copilot) | Parallax, pinned sections, scrub timelines, horizontal scroll, "make it scroll like Apple" | Covers GSAP ScrollTrigger and Motion v12 side by side, with cleanup and reduced-motion rules. |
| Assets | `higgsfield-generate`, `higgsfield-brandkit` (higgsfield-ai/skills) | Hero stills and loops, section stills, OG images, product shots; a brand kit when none exists | The "cinematic" look is layout plus generated media. The director lists the slots after the direction is approved and generates to size. Paid service. |
| Audit | `web-design-guidelines` (vercel-labs/agent-skills) | Final review: a11y, focus, forms, dark mode, images, compositor-friendly animation | 100+ rules, independent second opinion from Impeccable's audit. Tiny. |
| Orchestrator | `design-director` (this repo) | Every design task | Interviews you into the brief, routes to the right skill, runs brief → direction → build → critique → polish → assets → audit with its design gate enforcing every step, carries the anti-slop checklist and ten DESIGN.md starting points. |

**Deliberately excluded**

- `frontend-design` (Anthropic). Good, but Impeccable is a superset of it. Installing both gives Claude two overlapping voices.
- `ui-ux-pro-max`. Big CSV lookup system (styles, palettes, fonts). Useful if you have no taste reference at all, but it tends to produce "picked from a menu" results and its output is heavy. The DESIGN.md starting points cover the no-reference case with less weight.
- `superdesign`. Requires an account and a hosted canvas. Fine product, but not needed for the loop above.
- `higgsfield-websites`. Higgsfield's own React 19 + Cloudflare site builder. Our stack builds the site; we only take their generation skills.
- Koomook/claude-frontend-skills and random "framer-motion" skills on directory sites. Unvetted or sketch-level; `animate` + `motion` + the GSAP skill cover the same ground.

## Install

Per project (recommended, so each project can carry its own brief and tokens):

```bash
cd your-project
bash /path/to/design-stack/install.sh
```

That copies everything from `vendor/` and touches no network. It writes:

- `.claude/skills/` — the eight skills plus `design-director` (with the gate script, the
  checklist, the brief and direction templates and `design-md/` inside it)
- `.claude/agents/impeccable-*.md` — Impeccable's helper agents
- `.claude/settings.local.json` — Impeccable's design-detector hook (merged, backup kept)
- `.claude/settings.json` — the design gate's hooks (merged, backup kept). This file is
  usually committed, so the gate binds everyone who opens the project in Claude Code.
- `.mcp.json` — the hosted Motion MCP servers `motion` (free) and `motion-plus` (optional)
- `CLAUDE.md` — the design rules appended (or created)

Flags: `--global` installs into `~/.claude` instead (MCP then needs the two `claude mcp add`
lines the script prints). `--no-higgsfield`, `--no-motion`, `--no-hook` skip those parts;
no flag skips the design gate. Rerunning the installer updates hooks it installed before.
`--update` refetches every vendored component from the network, rewrites
`vendor/MANIFEST.md`, then installs. `--manifest` only rewrites the manifest.

Hand-run equivalents of `--update`, if you ever need them:

```bash
npx -y skills add Leonxlnx/taste-skill --skill design-taste-frontend -a claude-code -y
npx -y skills add https://github.com/delphi-ai/animate-skill --skill animate -a claude-code -y
npx -y skills add https://github.com/github/awesome-copilot --skill gsap-framer-scroll-animation -a claude-code -y
npx -y skills add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code -y
npx -y skills add higgsfield-ai/skills --skill higgsfield-generate -a claude-code -y
npx -y impeccable install -y --project --providers=claude-code   # skill + agents + hook + engine binary
npx motion-ai                                                     # interactive; skill + MCP config
```

Plugin routes inside Claude Code, when npx is blocked: `/plugin marketplace add pbakaus/impeccable`
then `/plugin install impeccable@impeccable`; `/plugin marketplace add higgsfield-ai/skills` then
`/plugin install higgsfield@higgsfield`.

### Requirements

- Node 22+ (tasteskill's inspector, Impeccable `live`). The installer itself only needs `node`.
- A Chromium-based browser for the screenshot loops. tasteskill finds Chrome, Edge, Chromium
  or Brave on its own; for Arc, Vivaldi or Opera set `CHROME_PATH` to the binary (the installer
  prints the exact line). Without any, `lint.mjs` still runs and you screenshot by other means.
- Impeccable's engine is a native binary. `vendor/` carries macOS arm64; other platforms
  download it on first use (checksum-verified) or vendor it with `--update` on that platform.
- Higgsfield: paid account. The skill installs its CLI on first use and asks for
  `higgsfield auth login`.
- No API keys anywhere else.

## The workflow (what `design-director` runs and the gate enforces)

The right column is the step ID the gate checks.

```
0. Brief by interview (2 batches max)                                Q1–Q5 · Q6 Q6v Q7 Q8 Q9
   no references? → 3-question picker → one DESIGN.md starting point P1–P4
   DESIGN-BRIEF.md → you approve it                                  BRIEF · OK-brief
1. Classify → direction                                              DIRECTION · ROUTE
   marketing page → design-taste-frontend deals a direction
   product UI     → /impeccable init (PRODUCT.md) + /impeccable shape
   DESIGN-DIRECTION.md → you approve it                              OK-direction
   ─── UI files unlock here ───
2. Build  (no motion yet; honest stand-ins in every empty slot)
3. Critique → fix → polish, anti-slop checklist                      CRITIQUE · CHECKLIST
4. Motion pass: /impeccable animate decides WHAT moves; animate      MOTION
   decides values; motion / gsap skill implement HOW
4b. Assets: slot table → you say yes → higgsfield-generate → drop in ASSETS (OK-assets)
5. /impeccable audit + web-design-guidelines (+ tasteskill inspect)  AUDIT · INSPECT
   fresh 360/1440 screenshots + clean detector after the last change SHOTS · DETECT
6. Report: direction, type, palette, motion moment, assets, audit, what's left for launch,
   and the gate's ledger
```

Say "run the design director on this" or "design this properly" and Claude
loads the orchestrator. It will not start building without a brief, and the gate
would not let it.

## The design gate: why no step can be skipped

The director is a skill, and a skill is prose. Under a tool that takes four questions
per call and a rule of two batches, a model folded the visual-references question
into "Other", answered the stack question itself and skipped the no-references
picker. Nothing stopped it. The gate turns every step into evidence a hook checks
(`skills/design-director/scripts/gate.mjs`, wired by `install.sh`):

- **PreToolUse** refuses any write to a UI file (`.html .css .scss .sass .less .jsx .tsx
  .vue .svelte .astro`), by Write, Edit, MultiEdit, MCP file tools or the shell
  (redirects, `sed -i`, `cp`, `mv`, interpreters, scaffolders), until every brief and
  direction step is done and both approvals hold. It also refuses AskUserQuestion calls
  that carry their own answers, an approval asked before its steps are done, and any
  write to the evidence log, the gate script or the settings that load it.
- **PostToolUse** on AskUserQuestion records your answer to every question whose header
  is a step ID (`Q1`…`Q9`, `Q6v`, `P1`…`P4`, `OK-…`). An approval is your pick of the
  first option, stored with the sha256 of the file you approved: edit the file and the
  approval is gone.
- **Stop** pushes back once per turn when the next move is an approval or the finish
  of a build has an open step; otherwise it shows `design gate · 12/20 steps · next: Q6v`.
- `gate.mjs status` prints the ledger and the NEXT step; `gate.mjs verify` runs
  Impeccable's detector on every UI file and records the result.

| Step | Evidence the gate checks |
|---|---|
| Q1–Q9, Q6v, P1–P4 | your answer, recorded from AskUserQuestion. Q1–Q5 may instead cite the repo file that answers them, `(repo: package.json)`, which you see when you approve the brief. P1–P4 are required only when there are no references. |
| BRIEF, DIRECTION | every `Key:` line filled; knobs 1–5; Forbidden not empty; a real `design-md/` file when there are no references; class and taste skill agree (one taste skill per screen) |
| OK-brief, OK-direction | your yes, bound to the file's sha256 |
| ROUTE | `.taste-skill/direction.json` (public page); `PRODUCT.md`, and `DESIGN.md` when the brief has a starting point (product UI) |
| CRITIQUE, CHECKLIST, ASSETS, AUDIT | `.design/` files written after the direction approval; checklist fully ticked and answered; OG row on public pages; `OK-assets` before anything is generated |
| MOTION | `prefers-reduced-motion` handled in the UI code when the Motion knob is above 1 |
| INSPECT, SHOTS, DETECT | tasteskill report with 0 FAIL (public page), 360 and 1440 screenshots, a clean detector run: all newer than the last UI change |

What it cannot do, said plainly:

- It binds the agent inside Claude Code. You can still edit files yourself, run `!`
  shell commands, or turn hooks off; that is your call, not the agent's. Claude Code
  runs a project's hooks once you trust the folder (it asks on first open).
- The critique, the checklist and the audit are the agent's own reports. The gate
  checks they exist, are fresh and complete, not that they are good. Your answers, the
  detector and the inspector are the hard evidence.
- Shell checks match command text. A script that writes UI files without naming them
  on the command line, or a component kept in a `.js` file, gets past the file check
  (the finish checks still see the result).
- A `--global` install enforces only in projects that have a `.design/` folder, which
  the director creates. Install per project for the strict version.

## Motion AI Kit: free or paid?

Checked October 2026. The installer (`npx motion-ai`) and the `/motion` skill are
free and MIT. The free `motion` MCP server searches current docs and example metadata
with no account. **Motion+** (paid: Personal one-time licence or Business per seat)
unlocks MotionScore audits, CSS spring generation, the transition editor and the source
of 450+ examples and Motion UI components. So: the skill is in the stack as the
implementation layer for Motion-library work; MotionScore and friends are optional
extras, never required by the director.

## Visual assets (the Higgsfield answer)

The "cinematic" sites you've seen are usually: tasteskill or Impeccable for the
layout, plus **generated video loops and stills** dropped into the hero and
section backgrounds, plus the GSAP scroll skill to tie them to scroll. The
assets come from an image/video model, not from a design skill.

- `higgsfield-generate` makes hero images, video loops and OG images; `higgsfield-brandkit`
  builds a palette, logo marks, type and a brandbook when a brand does not exist yet.
  Both wrap the `higgsfield` CLI (self-installed on first use; `higgsfield auth login`; paid).
- Free alternative: tasteskill's `assets.mjs` searches open photo collections (CC0 / CC BY)
  and tells you which slots are placeholders to replace.
- Rule, enforced by the director's Step 4b and the gate's `OK-assets`: generate assets *after* the direction is
  approved, sized to the slots the direction defines, with your yes on the slot table
  first. Generating first and designing around them is how you get a video with a card
  grid under it.

## DESIGN.md starting points

`templates/design-md/` holds ten reference DESIGN.md files (MIT, from
rohitg00/awesome-claude-design) across the families editorial, warm, terminal,
cinematic, data-dense, brutalist, playful, indie and remix. The director offers them
only when you have no references, through a three-question picker, and you take one.
The brief's Forbidden list overrides their tokens; see `templates/design-md/README.md`
for the index and the caveats (Inter fallbacks, brand-only typefaces, accent hues).
VoltAgent's 68-brand catalogue is linked there, not bundled, because its files sit
behind getdesign.md's download terms.

## Files

- `install.sh`: offline installer; `--update` refreshes `vendor/`.
- `vendor/`: every third-party component, pinned. `vendor/MANIFEST.md` lists versions and hashes.
- `skills/design-director/SKILL.md`: the orchestrator skill.
- `skills/design-director/scripts/gate.mjs`: the design gate (hooks, `status`, `verify`).
- `templates/gate-hooks.json`: the hooks `install.sh` merges into `settings.json`.
- `templates/DESIGN-BRIEF.md`: the brief's shape; the director fills it from the interview.
- `templates/DESIGN-DIRECTION.md`: the direction's shape; approved before any UI file.
- `tests/gate.test.mjs`: the gate's tests, `node --test tests/gate.test.mjs`.
- `templates/CLAUDE.design.md`: appended to your project `CLAUDE.md`.
- `templates/anti-slop-checklist.md`: the review list the director runs.
- `templates/design-md/`: DESIGN.md starting points and their index.
- `HANDOFF.md`: state of this repo for whoever continues it.
