# Anti-slop checklist

Run against a screenshot and the code. Any "yes" in Part A is a fail.

## A. Tells (instant fail)
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

## B. Decisions (each must have an answer you can state)
- [ ] What is the ONE idea the hero expresses, in words of the subject's world?
- [ ] Which two typefaces, and why do they belong to this subject? What is the scale (list the sizes)?
- [ ] What is the palette's job? Where is colour *refused*?
- [ ] Which section breaks the grid, and on purpose?
- [ ] Where is the single orchestrated motion moment? What does every other motion respond to?
- [ ] Which image slots are real assets and which are honest placeholders?

## C. Floors
- [ ] 360px and 1440px screenshots both read correctly; no horizontal scroll
- [ ] Keyboard: tab order sane, focus visible, Esc closes overlays
- [ ] Contrast AA on all text, including on images (scrim present)
- [ ] `prefers-reduced-motion` disables non-essential motion
- [ ] Only `transform` and `opacity` are animated; no animating width/height/top/left
- [ ] Line length 45 to 80 characters; headings not skipped (h1 → h2 → h3)
- [ ] Images sized and lazy-loaded; no layout shift on load
