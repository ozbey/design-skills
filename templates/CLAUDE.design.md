## Design rules (design-stack)

- Before any visual work, read `./DESIGN-BRIEF.md`. If it is missing or unfilled, load the `design-director` skill and let it interview the user into one (two batches of questions, then the user says yes). Do not design from assumptions and do not hand the user a form to fill.
- Load the `design-director` skill for anything that touches UI, layout, styling, motion, on-screen copy or visual assets. It decides which design skill applies:
  - public-facing / marketing page → `design-taste-frontend`
  - product UI, dashboards, forms, app screens → `/impeccable` commands
  - motion decisions → `animate`; implementation in Motion / CSS springs → `motion`; scroll-driven or cinematic → `gsap-framer-scroll-animation`
  - hero loops, stills, OG images → `higgsfield-generate`, only after the direction is approved and the slot table has a yes
  - final review → `/impeccable audit` and `web-design-guidelines`
- Never run two taste skills on the same screen. One direction, one voice. One DESIGN.md starting point per project at most.
- Every design pass ends with critique → fix → polish → audit. Show the screenshot or the audit output, not a claim that it looks good.
- Motion is opt-in from the brief. Default is: one orchestrated moment, everything else responds to user action, `prefers-reduced-motion` respected.
- Assets are honest: no asset → typographic or drawn stand-in and a line in the report, never a fake stock image.
- Quality floors are non-negotiable: responsive at 360px and 1440px, visible focus states, AA contrast, no layout shift, no horizontal scroll.
