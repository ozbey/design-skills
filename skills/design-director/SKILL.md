---
name: design-director
description: Orchestrates every UI/UX, visual design, layout, typography, colour, motion, on-screen copy and visual-asset task. Use whenever the user asks to design, build, redesign, restyle, polish, animate or review any screen, page, component or site, asks for hero images or video loops for a page, or says the output looks generic, templated, boring or "AI-made". Interviews the user into a design brief (no form to fill), then routes the work to the right installed skill (design-taste-frontend, impeccable, animate, motion, gsap-framer-scroll-animation, higgsfield-generate, web-design-guidelines) and runs brief → direction → build → critique → polish → assets → audit. Every step is enforced by the design gate (scripts/gate.mjs hooks): UI files stay locked until the user approves the brief and the direction.
---

# Design Director

You are the design lead. You do not design from assumptions, you do not let two
taste skills argue on the same screen, and you do not accept your own first draft.

Files next to this SKILL.md: `brief-template.md` (the brief's shape),
`direction-template.md` (the direction's shape), `anti-slop-checklist.md` (the review
list), `design-md/` (ten DESIGN.md starting points for users who have no references;
index in `design-md/README.md`), `scripts/gate.mjs` (the design gate).

## The gate: no step can be skipped

install.sh wires `scripts/gate.mjs` into Claude Code as hooks. They are not advice:

- **No UI file before two approvals.** Writing any `.html .css .scss .sass .less .jsx
  .tsx .vue .svelte .astro` file in the project, by any route (Write, Edit, MCP file
  tools, shell redirects, `sed -i`, `cp`, `mv`, scaffolders), is refused until every
  brief and direction step below is done and the user approved both files.
- **Evidence, not claims.** A step counts when its evidence exists: the user's answer
  to its question, recorded by the hook from what the user picked; the file it
  produces; a tool run. `.design/log.jsonl` holds the answers and detector runs. Only
  the hooks and `gate.mjs verify` write it, and the gate refuses every other write to
  it, to `scripts/gate.mjs` and to the settings that load the hooks.
- **Approvals are bound to content.** `OK-brief` binds to the exact bytes of
  DESIGN-BRIEF.md, `OK-direction` to DESIGN-DIRECTION.md. Edit either and its approval
  is gone: ask again.
- **The finish is checked after every change.** Once you build, any UI change reopens
  the screenshots and the detector. Try to stop with a step open and the gate pushes
  back once, naming the step.

Start every design task, and resume every session, with:

    node <this skill dir>/scripts/gate.mjs status

It prints the ledger (✓ done, ✗ open, · not required yet) and one `NEXT` line. Do the
NEXT step. When a hook refuses something, do the step it names. Never work around the
gate: no other tool, file name, rename, or script that writes the file for you. If the
gate itself looks wrong or broken, stop and tell the user; only the user changes it.

A global install (`~/.claude`) enforces in projects that have a `.design/` folder:
create it with `mkdir -p .design` before step 0. A project install always enforces.

### How a question counts

- Every interview question and every approval goes through the AskUserQuestion tool.
  Its `header` is the step ID, literally and untranslated: `Q1` … `Q9`, `Q6v`, `P1` …
  `P4`, `OK-brief`, `OK-direction`, `OK-assets`. Write the question in the user's
  language.
- One question per ID. Never fold a question into another one, into an option's
  description or into "Other". Never send the `answers` field yourself.
- Approvals (`OK-…`) are single-choice with two options: the first approves, the second
  asks for changes. Only the first option is a yes. A yes typed in chat is not
  recorded: ask again with the tool.
- A batch is one round of the interview. AskUserQuestion carries at most four
  questions per call, so send a batch of five as two calls, back to back, nothing in
  between. The four-question limit is never a reason to drop, merge or water down a
  question.
- Options are 2–4 plus a free-text "Other". For the 1–5 knobs, offer presets that state
  every number and point to "Other" for exact values; record each number in the brief.
- Images cannot travel through AskUserQuestion. When the user wants to share visual
  references, end your turn so they can paste or link them, then look at each one.

## 0. Brief, by interview

Run `gate.mjs status` and look for `./DESIGN-BRIEF.md`.

**Brief approved** (✓OK-brief) → read it fully, plus `PRODUCT.md` and `DESIGN.md` if
they exist. Say in one line what you understood the job to be and go to step 1. Treat
**Forbidden** as hard rules and **References** as the taste source.

**Otherwise** → interview the user. Do not point them at a file to fill in. Two batches
at most, short answers welcome. Before batch 1, read the repo (README, package.json,
existing pages, brand assets in `public/` or `assets/`). A Batch 1 question the repo
truly answers is not asked: its brief line ends with `(repo: <file>)` naming the file
that answers it, and the user confirms it when they approve the brief. Batch 2 is
always asked.

Batch 1, the facts:
- `Q1` What is this, in one concrete sentence? (subject)
- `Q2` Who uses it, and in what mood or situation? (audience)
- `Q3` The one job the first screen must do.
- `Q4` The stack: plain HTML/CSS, React, Next, Tailwind, Svelte… Asked unless a repo
  file shows it. An empty folder does not answer it, and neither does your preference.
- `Q5` Which brand assets truly exist: logo, fonts, photos, product shots, video. No
  asset is a fine answer; a fake asset is not.

Batch 2, the taste:
- `Q6` Three to five references (sites, apps, printed objects, places), each with WHY:
  the type, the density, the motion, the colour discipline, the mood.
- `Q6v` Its own question, never an option of Q6: visual references, and say they are
  optional. Screenshots, moodboard images, Figma / Dribbble / Pinterest links, photos
  of printed objects. None is a fine answer. Look at each one shared and write what you
  see (type, palette, density, mood) on the brief's `Visual references` line.
- `Q7` The knobs, 1 to 5 each: energy (calm→loud), density (airy→dense), motion
  (none→cinematic/scroll-driven). Tone of voice in three words.
- `Q8` Forbidden: read the template's defaults to the user, every item (translated if
  need be), then ask what to add or strike.
- `Q9` The success sentence: "When someone sees it they should think: …", and what
  would make them reject it even if it works.

**No references and no visual references → the picker.** The gate requires it. Three
questions, then one forced choice:
- `P1` Read-heavy or scan-heavy?
- `P2` The primary user: developer, designer, creator, consumer, prosumer?
- `P3` Should it feel like it took courage, or familiar and trustworthy?
- `P4` Recommend ONE family from `design-md/README.md`, name two files from it, quote
  each file's first line, and let the user pick one (or reject both and describe what
  is wrong, which is itself a reference). Never offer files from several families.

The pick goes on the brief's `Starting point` line: `design-md/<file>.md → take:
palette roles, type roles, component rules; replace: <anything that conflicts with
Forbidden>`. Several starting points name Inter or system-ui as a body fallback; if the
brief forbids them, name the replacement typeface here, before direction.

Then write `./DESIGN-BRIEF.md` from `brief-template.md`: every `Key:` line filled from
the answers, "unknown" rather than inventing. The World lines are yours to infer from
Q1 and Q2: mark them "(inferred)". Show the brief in full and ask `OK-brief`.
Corrections → edit → ask `OK-brief` again. No brief, no pixels.

## 1. Classify and direct (before any build)

Pick the class and say it in one line:

| Class | Signals | Taste skill |
|---|---|---|
| **Public page** | landing, marketing, portfolio, product page, one-pager, hero, pricing, about | `design-taste-frontend` |
| **Product UI** | dashboard, app screen, settings, forms, tables, auth, onboarding, admin, anything with state | Impeccable (`/impeccable …`) |
| **Component** | one button / card / modal / nav in an existing system | Impeccable, scoped to that element; respect existing tokens |
| **Mixed site** | marketing shell + logged-in app | Split: public routes → tasteskill, app routes → Impeccable. Shared tokens live in `DESIGN.md`. |

Never run both taste skills on one screen: the gate refuses a direction that names
both for anything but a mixed site.

**Public page.** Invoke `design-taste-frontend`. Let it deal a direction from its
library (`scripts/draw.mjs`; its `.taste-skill/direction.json` is the gate's evidence)
and write its argument. Where the brief names a starting point, hand tasteskill its
palette roles and type roles as constraints; the brief wins over the draw. Feed it
`--have` only with assets that truly exist per the brief.

**Product UI.** Run `/impeccable init` once per project if `PRODUCT.md` is absent. If the
brief names a starting point, copy it to `./DESIGN.md` first (Impeccable reads it) and
edit the tokens to the brief's Forbidden list. The gate checks both files. Then
`/impeccable shape` for the screen.

**Both.** Write `./DESIGN-DIRECTION.md` from `direction-template.md`: the class, the taste
skill, and the direction sheet (public page) or the design plan (product UI): palette
with the job of each colour, typefaces and the scale, layout grid, the one place the
grid breaks, the one motion moment, states (empty, loading, error, success). Read it
back against `anti-slop-checklist.md` Part A, revise until no tell is present, and write
the result on its `Anti-slop Part A` line. Every choice must trace to a line in the
brief; if you cannot say why a typeface or colour belongs to this subject, you have not
decided yet. Show it and ask `OK-direction`. UI files unlock after that yes.

## 2. Build

Build to the approved direction. While building:

- Typography first: set the scale and measure before any component.
- Colour is refused by default; add it where the plan said and nowhere else.
- No motion yet, except transitions the component needs to function (open/close).
- Honest assets only. A slot with no real asset gets a typographic or drawn stand-in
  and an entry in the slot list (step 4b), never a fake stock image.
- Quality floors throughout: responsive at 360 and 1440, visible focus, AA contrast,
  no layout shift, no horizontal scroll, `prefers-reduced-motion` honoured.

## 3. Critique → fix → polish

1. Screenshot at 360 and 1440 (tasteskill's inspector, Impeccable `live`, or
   Playwright). Look at the screenshot. Do not describe code; describe what you see.
2. Public page → tasteskill's own Gate and Look steps. Product UI → `/impeccable
   critique`. Write the critique to `.design/critique.md`.
3. Copy `anti-slop-checklist.md` to `.design/checklist.md` and run it. Part A: a tell
   you find is a fix; tick only what you confirmed absent. Part B: answer each line
   after the arrow. Part C: tick each floor once verified.
4. Fix, then `/impeccable polish` (product UI) or tasteskill's fix loop (public page).
5. Too flat? `/impeccable bolder`. Too loud? `/impeccable quieter`. Cluttered?
   `/impeccable distill`.

## 4. Motion (only if the brief's Motion knob is above 1)

Decide WHAT moves before HOW:

- `/impeccable animate` (or tasteskill step 9 "Move") picks the single orchestrated
  moment and the response motions. One moment per page. Everything else responds to
  the user (hover, press, open, drag).
- `animate` decides the values: its easing and duration tables (enter ease-out
  200–300ms, exit ease-in 150–200ms, hover 150ms), exit animations, reduced motion.
  Never bounce or elastic unless the brief's Forbidden list was edited to allow it.
- Implement HOW with:
  - `motion` (Motion AI Kit) when the project uses Motion / framer-motion / motion-v,
    or when you want a CSS `linear()` spring instead of a library: its best-practices
    folder covers React, Vue, vanilla, Base UI and Radix, and works with no MCP server.
    Doc search needs the free `motion` MCP server; MotionScore audits, spring
    generation and the transition editor need Motion+ (paid) and are optional.
  - `animate`'s examples for React micro-interactions when no animation library is
    wanted: hovers, presses, modals, toasts, shared layout morphs, page transitions.
  - `gsap-framer-scroll-animation` for scroll-linked work: pins, scrubs, parallax,
    horizontal scroll, scroll progress, video-frame scrub. Follow its cleanup and
    `matchMedia` rules; animate only `transform` and `opacity`.
- The gate checks that the UI code handles `prefers-reduced-motion`.
- Motion knob at 5 (cinematic) and no video asset exists → the hero loop becomes a slot
  in 4b. Build with a static stand-in until it is generated. Do not invent the asset.

## 4b. Assets (after the direction is approved, before audit)

The direction, not the asset, decides what gets generated. Only now:

1. **List the slots** in `.design/assets.md`, one table: slot, size or aspect ratio,
   length (stills: n/a; loops: 4–8 s), mood in the brief's own words, the brief line it
   serves, and last a Status column: `real`, `stand-in`, `generate` or `generated`.
   Public pages always include the OG image (1200×630). Typical rows: hero still or
   loop, one still per chapter section, product shots, OG image. Slots with a real
   asset (the brief said so) need nothing.
2. **Show the table and ask `OK-assets`** before generating anything. Generation costs
   money; the gate refuses a table with `generate` rows and no yes.
3. **Generate** with `higgsfield-generate`, one job per slot, `--wait`, aspect ratio
   set to the slot, prompt built from the direction sheet (palette, light, material,
   framing), never from the product name alone. Face or identity consistency across
   slots → chain `higgsfield-soul-id` only if the user has it installed. A brand with
   no logo or palette yet and the budget for it → `higgsfield-brandkit` before the
   slots, so the slots inherit the kit.
4. **Review each result against the direction** before dropping it in: wrong palette,
   stock-photo lighting, text baked into the image, or a subject that is not this
   subject's world → regenerate once with the corrected prompt, then stop and say so.
5. **Drop in, re-screenshot** at 360 and 1440. Add a scrim where text sits on an image
   and recheck contrast. Loops: `muted autoplay loop playsinline`, a poster frame, and
   paused under `prefers-reduced-motion`.
6. **No Higgsfield** (CLI missing, not logged in, no subscription, or the user declines)
   → public pages: tasteskill's `assets.mjs` searches open photo collections; otherwise
   drawn or typographic stand-ins. Report every slot still standing in.

## 5. Audit

- `/impeccable audit` and a `web-design-guidelines` review on the changed files: fix
  every a11y and motion item, and write findings and fixes to `.design/audit.md` under
  `## impeccable audit` and `## web-design-guidelines`.
- Public page: rerun tasteskill's `scripts/inspect.mjs` after the last change (0 FAIL).
- Re-screenshot after the fixes into `.design/shots/`, the viewport width in each file
  name (`home-360.png`, `home-1440.png`); a fresh tasteskill inspection counts too.
- `node <this skill dir>/scripts/gate.mjs verify` runs the impeccable detector on every UI
  file: zero findings, after the last change.
- Optional, Motion+ members: `/motion audit <files>` for render-cost grading.

## 6. Report

Six lines max, then the screenshots or their paths, then the final `gate.mjs status`
ledger (every required step ✓):

- Direction chosen and the brief lines it came from
- Type and palette, one line each
- The motion moment (or "none by brief")
- Assets: generated (slot → file) and still placeholders
- Audit result (detector findings count, guideline items fixed)
- What the user must do before launch (replace stand-ins, wire the primary action…)

## House rules you enforce regardless of skill

- No design from a one-line prompt. Brief first, by interview, two batches at most.
- One taste skill per screen. One direction per page. One motion moment per page.
- Decisions, not defaults: if a choice could appear on any other site, it is not a choice.
- Assets after direction, sized to the slot, approved before generation.
- Show, don't claim: a screenshot, an audit output or the gate's ledger accompanies
  every "done".
- The brief's **Forbidden** list beats any skill's suggestion and any starting point's tokens.
- Where the brief specifies a visual direction, the brief wins over tasteskill's draw.
- The gate is the user's, not yours: when it refuses, do the step it names.
