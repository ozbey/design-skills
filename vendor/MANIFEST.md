# Vendored sources

Written by `install.sh --manifest` on 2026-10-17. `install.sh --update` refetches every row and rewrites this file.
install.sh installs these copies without touching the network.

| Component | Vendored at | Upstream | Version | License |
|---|---|---|---|---|
| design-taste-frontend | vendor/skills/design-taste-frontend | github.com/Leonxlnx/taste-skill (via `npx skills add`) | lock 18f81679d2b0 | MIT |
| animate | vendor/skills/animate | github.com/delphi-ai/animate-skill | lock ffe5d0020ae9 | none declared upstream |
| gsap-framer-scroll-animation | vendor/skills/gsap-framer-scroll-animation | github.com/github/awesome-copilot | lock e6a4caf23b81 | MIT |
| web-design-guidelines | vendor/skills/web-design-guidelines | github.com/vercel-labs/agent-skills | lock a6a44d5498f7 | none declared upstream |
| impeccable skill + agents + hook | vendor/impeccable/ | `npx impeccable install` release channel (impeccable.style, github.com/pbakaus/impeccable) | plugin 4.6.0 · engine 0.1.15 · binaries: darwin-arm64  | Apache-2.0 |
| motion (/motion skill) | vendor/skills/motion, vendor/motion/ | github.com/motiondivision/ai-kit plugins/motion |  | MIT (package.json; no LICENSE file in repo) |
| higgsfield-generate | vendor/skills/higgsfield-generate | github.com/higgsfield-ai/skills | 0.13.0 · lock 45867a1bfe18 | MIT |
| higgsfield-brandkit | vendor/skills/higgsfield-brandkit | github.com/higgsfield-ai/skills | 0.13.0 · lock ea343415a230 | MIT |
| DESIGN.md starting points | templates/design-md/ | github.com/rohitg00/awesome-claude-design design-md/ | 10 files, see templates/design-md/README.md | MIT |

Notes

- The impeccable engine binary is platform-specific. Vendored platforms: darwin-arm64 . On any other platform the launcher downloads the matching binary from GitHub releases on first use (checksum-verified), or run `install.sh --update` there to vendor it.
- sha256 of the vendored darwin-arm64 engine: c7914209b4490dc81b7ab17c20f1f76415d1f0b8bb5de6f7e86e9aa111d1c1a5
- vendor/skills-lock.json holds the content hashes the `skills` CLI recorded at fetch time.
- The Higgsfield skills install their CLI themselves on first use (`curl … higgsfield-ai/cli/main/install.sh | sh`) and need `higgsfield auth login` plus a paid subscription. That part cannot be vendored.
- The Motion MCP servers are hosted (https://mcp.motion.dev); the skill's best-practices/ folder works with no server at all.
