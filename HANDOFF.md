# Handoff: state of design-stack

Last worked on 2026-10-17 on a Mac (arm64, Node 26, Brave + Opera installed, no Chrome).
Paste the "Continue" section into Claude Code in a folder that has `design-stack/` extracted.

## What is here

- `README.md`: the chosen stack and why, install, workflow, the Motion and Higgsfield answers.
- `install.sh`: offline installer from `vendor/`. `--update` refetches and rewrites `vendor/MANIFEST.md`.
- `vendor/`: every third-party component, pinned (versions and hashes in `vendor/MANIFEST.md`).
- `skills/design-director/SKILL.md`: the orchestrator. Interview-first Step 0, Step 4b Assets.
- `templates/`: brief shape, CLAUDE.md snippet, anti-slop checklist, `design-md/` starting points.

## Decisions (do not re-litigate)

Stack: design-taste-frontend (Leonxlnx/taste-skill) for public pages; impeccable (pbakaus) for
product UI + audit + detector hook; animate (delphi-ai) for motion decisions; **motion** (Motion AI
Kit, added 2026-10-17) for Motion-library implementation and CSS springs; gsap-framer-scroll-animation
(github/awesome-copilot) for scroll/cinematic; web-design-guidelines (vercel-labs) as independent
audit; higgsfield-generate + higgsfield-brandkit for assets; design-director (ours) routes everything.

Excluded: Anthropic frontend-design (impeccable supersedes it), ui-ux-pro-max, superdesign,
higgsfield-websites, Koomook/claude-frontend-skills.

Resolved questions:

- **Motion AI Kit**: `npx motion-ai` and the `/motion` skill are free and MIT. MotionScore audits, CSS
  spring generation, the transition editor and premium source need Motion+ (paid). So the skill is in
  the stack as the implementation layer; Motion+ features are optional. `npx motion-ai` is interactive
  with no flags, so install.sh copies the skill from `vendor/skills/motion` and writes the two hosted
  MCP servers into `.mcp.json` itself (project) or prints `claude mcp add` lines (global).
- **DESIGN.md starting points**: vendored ten files from rohitg00/awesome-claude-design (MIT, in-repo,
  organised by aesthetic family). Not vendored: VoltAgent/awesome-claude-design, whose 68 files sit
  behind getdesign.md's download button and terms that allow use but are silent on redistribution.
  Linked only. Index and caveats in `templates/design-md/README.md`.
- **Impeccable vendoring**: the `npx impeccable install` release copy (4.6.0, engine 0.1.15) is
  vendored, not the git `plugin/` folder, because git main is unreleased work that already differs
  (it uses `${CLAUDE_SKILL_DIR}` paths the release does not). The plugin's `plugin.json` and
  `hooks.json` are kept from git for the `/plugin` route. The macOS arm64 engine binary (16 MB) is
  vendored next to the launcher, which is the first place the launcher looks, so the detector and
  hook work with no network on this platform. Other platforms download on first use
  (checksum-verified) or vendor with `--update`.
- **Hook install**: the installer merges `vendor/impeccable/hooks/settings.project.json` into
  `.claude/settings.local.json` (project) or `~/.claude/settings.json` (global, path rewritten to
  `$HOME/...`), keeps a `.bak`, skips if an impeccable hook is already there.
- **Brief**: the director interviews (two batches) and writes `DESIGN-BRIEF.md`; install.sh no longer
  drops an empty brief into the project.

## Verified

- Clean-room project install with proxies pointed at a dead port: all skills, agents, hook, MCP
  entries, CLAUDE.md written; existing `.mcp.json` and `settings.local.json` contents preserved.
- Global install into a throwaway `HOME` with a pre-existing `settings.json` containing other hooks:
  merged, backup kept; rerun says "already present".
- `--update` on a copy of the repo with network: every component refetched, manifest rewritten.
- Vendored impeccable launcher answers `engine-probe` with `impeccable-engine 0.1.15` offline.
- On a sample slop page from the test install: impeccable `detect` found 9 anti-patterns offline with the vendored engine; tasteskill `lint.mjs` 6 FAIL / 4 WARN; tasteskill `inspect.mjs` drove Brave (auto-detected by its `lib/cdp.mjs`, no `CHROME_PATH` needed) and wrote screenshots at 1440/768/390.

## Remaining

1. Vendor engine binaries for linux-x64 and darwin-x64 by running `install.sh --update` on those
   platforms (or copying from `~/.impeccable/bin/0.1.15/` after one online run there).
2. The director's interview and Step 4b have not been exercised end to end on a real project with a
   Higgsfield account. First real run: note where the question batches feel long and trim.
3. `higgsfield-brandkit` needs ImageMagick, librsvg, Poppler, LibreOffice for its brandbook stages
   (its `references/prerequisites.md`); decide whether to mention a `brew install` line in README or
   leave it to the skill's own prompt (currently: left to the skill).
4. Consider pinning `npx -y skills add` to a `skills` CLI version in `--update` if a future CLI
   changes the lock-file shape.

## Continue

```
I'm continuing the design-tooling setup. The folder design-stack/ is the work so far.
Read README.md, HANDOFF.md and vendor/MANIFEST.md first. Decisions in HANDOFF.md are
settled; start with its "Remaining" list.
```
