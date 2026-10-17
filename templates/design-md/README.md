# DESIGN.md starting points

Ten reference DESIGN.md files for the case where the user has no references at all.
The design director offers them in Step 0 through a three-question picker and the
user picks ONE. They are starting points for tokens and rules, not directions: the
brief's Forbidden list overrides any line in them, and the taste skill still deals
the actual direction.

Source: [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design)
`design-md/`, MIT (see `LICENSE.rohitg00`). The files are independent analyses of
publicly observable patterns, not official brand systems. `install.sh --update`
refetches them.

Not vendored: [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design)
(68 brand files). Those files live on getdesign.md behind a download button, and the
site's terms allow use in your projects but say nothing clear about redistribution, so
link, don't bundle. If a user wants one of those brands, point them at
`getdesign.md/<brand>/design-md` and have them drop the file in as `./DESIGN.md`.

## Index (family · file · one line · offer when)

| Family | File | What it is | Offer when |
|---|---|---|---|
| Editorial | `editorial--vercel.md` | Grayscale only, Geist, hairline rules, black as the accent | Developer tool, infrastructure, "we don't need a colour to look expensive" |
| Warm editorial | `warm--claude.md` | Terracotta on cream, serif display, slow rhythm, long-form first | Read-heavy, considered, human; writing, education, research |
| Terminal | `terminal--ollama.md` | Black/white, monospace everywhere, zero depth, man-page feel | CLI-first developer products; user is a developer; courage over comfort |
| Cinematic | `cinematic--ferrari.md` | Black/white chiaroscuro cut by one red, 0-radius, oversized numerals | Performance or luxury brands, theatre, one decisive accent |
| Cinematic | `cinematic--runway.md` | Film-grade dark UI, oversized type, motion-forward hero, magenta accent | Creator tools, media, motion knob at 4–5 |
| Data-dense | `data-dense--posthog.md` | Charts as hero, cobalt + warning yellow, warm chrome around dense data | Analytics, dashboards, scan-heavy with personality |
| Brutalist | `brutalist--the-verge.md` | Hard edges, one saturated hue, deliberate type mixing, oversized numerals | Publishing, opinionated media, "built to be remembered" |
| Playful | `playful--figma.md` | Multi-hue palette as identity, rounded, illustration-friendly | Consumer and prosumer SaaS that must feel welcoming |
| Indie | `indie--granola.md` | Warm glass over cream, editorial serif, paper-notebook feel | Small premium tools, indie, calm; a cult-product posture |
| Remix | `remix--stripe-x-a24.md` | Stripe's grid and trust CTAs under A24 poster-size display serif | Fintech or B2B that needs personality without losing trust |

## Caveats the director must apply

- **Inter / system-ui.** Most files name Inter or system-ui as a body or fallback face
  because the analysed brand uses it. The brief's default Forbidden list bans Inter as a
  *display* face. When a starting point is picked, name the replacement in the brief's
  References line before Direction; do not let it leak through as a default.
- **Brand-specific faces** (FerrariSans, Styrene, Söhne, Matter, Whyte Inktrap…) are
  not free and usually not available. They name a *role* (geometric grotesque, humanist
  sans, editorial serif); the director picks an available face for that role and says so.
- **Accents.** Several files reproduce a brand's accent (Figma's multi-hue, Runway's
  magenta, PostHog's cobalt). Keep the *role* of the accent, change the hue to the
  subject's world unless the user is literally building for that brand.
- **One starting point per project.** Mixing two is how "picked from a menu" happens.
  The remix file exists for the user who wants a hybrid; let it do the mixing.
