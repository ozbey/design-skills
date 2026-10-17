# Design Brief

The design director fills this from a two-batch interview and shows it to you for a yes
(`OK-brief`). Every line gets an answer or "unknown". "Modern and clean" is not an answer; it is
the slop prompt. Keep every `Key:` as written: the design gate reads them. The `<!-- -->` notes
are hints, not answers. A Batch 1 line the repo already answers ends with its source, e.g.
`- Stack: Next 15 + Tailwind (repo: package.json)`. Any edit after your yes needs a new yes.

## Subject
- What: <!-- Q1 · what this is, one concrete sentence -->
- Who: <!-- Q2 · who uses it, in what mood / situation -->
- Job: <!-- Q3 · the one job the first screen must do -->

## World
- Things: <!-- three real-world things from this subject's world (materials, places, tools, documents, rituals); mark "(inferred)" whatever the user did not say -->
- Vernacular: <!-- industry words only insiders use; mark "(inferred)" -->

## References
- Reference: <!-- Q6 · URL / name → what to steal (type? density? motion? colour discipline?); one line each, 3 to 5 -->
- Reference:
- Reference:
- Visual references: <!-- Q6v · each screenshot / image / link → what you see in it (type, palette, density, mood), or "none" -->
- Starting point: <!-- P4, only when there are no references · design-md/<file>.md → take: … / replace: … -->

## Direction knobs
- Energy: <!-- Q7 · 1 calm … 5 loud -->
- Density: <!-- Q7 · 1 airy … 5 dense -->
- Motion: <!-- Q7 · 1 none … 5 cinematic / scroll-driven -->
- Tone: <!-- Q7 · tone of voice in three words -->

## Hard constraints
- Stack: <!-- Q4 · HTML/CSS, React, Next, Tailwind, Svelte… -->
- Assets: <!-- Q5 · brand assets that EXIST (logo, fonts, photos, product shots, video). Be honest; no asset → no fake asset. -->
- Accessibility: WCAG AA, keyboard, reduced motion
- Support: <!-- dark mode? RTL? mobile first? -->

## Forbidden (Q8: every default is read to the user, who adds or strikes)
- Inter / Arial / system-ui as display font
- Purple-blue gradients, glassmorphism glows, blobs
- Three-icon-card feature rows, nested cards, card-on-card
- Eyebrow labels, single-word colour accents in headlines
- Bounce / elastic easing, everything fading up on scroll with one duration
- Pure #000 / #fff, grey text on coloured backgrounds
- Stock "team in office" photography, emoji as icons

## Success
- Think: <!-- Q9 · When someone sees it they should think: "…" -->
- Reject: <!-- Q9 · what would make you reject it even if it works -->

Asset slots are not part of the brief: the director lists them in `.design/assets.md` at step 4b.
