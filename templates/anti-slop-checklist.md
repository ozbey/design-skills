# Anti-slop checklist

Copy to `.design/checklist.md` and fill it against a screenshot and the code. The design gate
reads that copy: every box ticked, every B line answered after the arrow, nothing deleted.

## A. Tells (instant fail)
Tick a box only once you have confirmed the tell is ABSENT from the screenshot and the code.
A tell you find is a fix, never a tick.
- [ ] Centred headline + eyebrow label + subtitle + two buttons, repeated in every section
- [ ] Row of three or four equal cards with an icon, title, two lines
- [ ] Purple/blue or pink/orange gradient anywhere; "glow" box-shadows
- [ ] Inter, Arial, Roboto or system-ui as the display face
- [ ] Nested cards, cards on tinted cards, borders on everything
- [ ] Single-word gradient or colour accent inside a headline
- [ ] Everything fades up on scroll with the same duration; bounce / elastic easing
- [ ] Pure black or pure white backgrounds with grey #6b7280 body text
- [ ] Emoji as icons; "team at laptop" stock photos; generic 3D blob illustrations
- [ ] Copy says "Unleash", "Elevate", "Seamless", "Supercharge", "Next-gen"

## B. Decisions (answer after the arrow, then tick)
- [ ] What is the ONE idea the hero expresses, in words of the subject's world? →
- [ ] Which two typefaces, and why do they belong to this subject? What is the scale (list the sizes)? →
- [ ] What is the palette's job? Where is colour *refused*? →
- [ ] Which section breaks the grid, and on purpose? →
- [ ] Where is the single orchestrated motion moment? What does every other motion respond to? →
- [ ] Which image slots are real assets and which are honest placeholders? →

## C. Floors (tick once verified)
- [ ] 360px and 1440px screenshots both read correctly; no horizontal scroll
- [ ] Keyboard: tab order sane, focus visible, Esc closes overlays
- [ ] Contrast AA on all text, including on images (scrim present)
- [ ] `prefers-reduced-motion` disables non-essential motion
- [ ] Only `transform` and `opacity` are animated; no animating width/height/top/left
- [ ] Line length 45 to 80 characters; headings not skipped (h1 → h2 → h3)
- [ ] Images sized and lazy-loaded; no layout shift on load
