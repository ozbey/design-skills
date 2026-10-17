#!/usr/bin/env bash
# Design Stack installer.
#
#   bash install.sh                  install into the current project, offline, from vendor/
#   bash install.sh --global         install into ~/.claude instead of ./.claude
#   bash install.sh --update         refresh vendor/ from the network first, then install
#   bash install.sh --no-higgsfield  skip the Higgsfield skills (paid service)
#   bash install.sh --no-motion      skip the Motion AI Kit skill and its MCP entries
#   bash install.sh --no-hook        install impeccable without its design-detector hook
#   bash install.sh --manifest       only rewrite vendor/MANIFEST.md and exit
#
# The default path makes no network calls: everything it installs ships in vendor/.
# Needs node (for JSON merges). The skills themselves need Node 22+ and a
# Chromium-based browser for their screenshot loops; see README.md.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR="$HERE/vendor"

GLOBAL=0; UPDATE=0; HIGGS=1; MOTION=1; HOOK=1; MANIFEST_ONLY=0
for a in "$@"; do
  case "$a" in
    --global|-g)      GLOBAL=1 ;;
    --update)         UPDATE=1 ;;
    --no-higgsfield)  HIGGS=0 ;;
    --no-motion)      MOTION=0 ;;
    --no-hook)        HOOK=0 ;;
    --manifest)       MANIFEST_ONLY=1 ;;
    -h|--help)        sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown flag: $a (try --help)"; exit 2 ;;
  esac
done

say()  { printf '→ %s\n' "$*"; }
ok()   { printf '  ok%s\n' "${1:+ ($1)}"; }
warn() { printf '  warning: %s\n' "$*"; }
fail() { printf '  FAILED: %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1"; exit 1; }; }

need node
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')

if (( GLOBAL )); then
  DEST="$HOME/.claude/skills"; DEST_AGENTS="$HOME/.claude/agents"
  SETTINGS="$HOME/.claude/settings.json"
  HOOK_BIN='$HOME/.claude/skills/impeccable/scripts/impeccable'
else
  DEST=".claude/skills"; DEST_AGENTS=".claude/agents"
  SETTINGS=".claude/settings.local.json"
  HOOK_BIN='${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/impeccable'
fi

# ---------------------------------------------------------------- helpers

# merge_hooks <settings file> <template json> <launcher path to substitute>
merge_hooks() {
  node - "$1" "$2" "$3" <<'EOF'
const fs = require('fs'), path = require('path');
const [file, tpl, bin] = process.argv.slice(2);
let cur = {};
if (fs.existsSync(file)) {
  try { cur = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.log('  cannot parse ' + file + '; leaving it alone, hook NOT installed'); process.exit(1); }
}
const marker = 'skills/impeccable/scripts/impeccable';
if (JSON.stringify(cur.hooks || {}).includes(marker)) { console.log('  hook already present in ' + file); process.exit(0); }
const t = JSON.parse(fs.readFileSync(tpl, 'utf8'));
const from = '${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/impeccable';
cur.hooks = cur.hooks || {};
for (const [ev, entries] of Object.entries(t.hooks || {})) {
  const fixed = JSON.parse(JSON.stringify(entries).split(from).join(bin));
  cur.hooks[ev] = [...(cur.hooks[ev] || []), ...fixed];
}
let note = '';
if (fs.existsSync(file)) { fs.copyFileSync(file, file + '.bak'); note = ' (backup: ' + file + '.bak)'; }
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(cur, null, 2) + '\n');
console.log('  hook written to ' + file + note);
EOF
}

# merge_mcp <.mcp.json>
merge_mcp() {
  node - "$1" <<'EOF'
const fs = require('fs'); const file = process.argv[2]; let cur = {};
if (fs.existsSync(file)) {
  try { cur = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.log('  cannot parse ' + file + '; MCP entries NOT added'); process.exit(1); }
}
cur.mcpServers = cur.mcpServers || {};
const added = [];
for (const [n, u] of [['motion', 'https://mcp.motion.dev'], ['motion-plus', 'https://mcp.motion.dev/plus']]) {
  if (!cur.mcpServers[n]) { cur.mcpServers[n] = { type: 'http', url: u }; added.push(n); }
}
if (added.length) { fs.writeFileSync(file, JSON.stringify(cur, null, 2) + '\n'); console.log('  MCP servers ' + added.join(', ') + ' added to ' + file); }
else console.log('  MCP servers already in ' + file);
EOF
}

# merge_lock <skills-lock.json from a fresh `npx skills add`>
merge_lock() {
  [[ -f "$1" ]] || return 0
  node - "$VENDOR/skills-lock.json" "$1" <<'EOF'
const fs = require('fs'); const [out, inp] = process.argv.slice(2);
let cur = { version: 1, skills: {} };
if (fs.existsSync(out)) { try { cur = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (e) {} }
const j = JSON.parse(fs.readFileSync(inp, 'utf8'));
for (const [k, v] of Object.entries(j.skills || {})) {
  if (k.startsWith('higgsfield-') && !['higgsfield-generate', 'higgsfield-brandkit'].includes(k)) continue;
  cur.skills[k] = v;
}
fs.writeFileSync(out, JSON.stringify(cur, null, 2) + '\n');
EOF
}

copy_skill() { # <name>
  say "$1"
  if [[ -d "$VENDOR/skills/$1" ]]; then
    rm -rf "$DEST/$1" && cp -R "$VENDOR/skills/$1" "$DEST/" && ok
  else
    fail "not in vendor/skills (run install.sh --update)"
  fi
}

browser_hint() {
  [[ -n "${CHROME_PATH:-}" ]] && return 0
  if [[ "$(uname -s)" == Darwin ]]; then
    # tasteskill's cdp.mjs finds these on its own (Chrome, Chromium, Edge, Brave)
    local std=( "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
                "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
                "/Applications/Chromium.app/Contents/MacOS/Chromium"
                "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
                "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" )
    # these work too, but only through CHROME_PATH
    local alt=( "/Applications/Arc.app/Contents/MacOS/Arc"
                "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi"
                "/Applications/Opera.app/Contents/MacOS/Opera" )
    local b
    for b in "${std[@]}"; do [[ -x "$b" ]] && return 0; done
    for b in "${alt[@]}"; do
      if [[ -x "$b" ]]; then
        warn "no Chrome/Edge/Chromium/Brave found. tasteskill's inspector can drive $(basename "$b") instead; add to your shell profile:"
        printf '    export CHROME_PATH="%s"\n' "$b"
        return 0
      fi
    done
  else
    command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 \
      || command -v chromium-browser >/dev/null 2>&1 || command -v microsoft-edge >/dev/null 2>&1 && return 0
  fi
  warn "no Chromium-based browser found: tasteskill's screenshot inspector and impeccable live will not run. Install Chrome, or set CHROME_PATH."
}

# ---------------------------------------------------------------- manifest

skill_meta() { # <skill dir> -> "version | hash"
  local v h
  v=$(sed -n '1,/^---$/p' "$1/SKILL.md" 2>/dev/null | sed -n '2,30p' | grep -i -m1 '^version:' | sed 's/^version: *//; s/^"//; s/"$//')
  h=$(node -p "try{const j=require('$VENDOR/skills-lock.json');(j.skills['$(basename "$1")']||{}).computedHash||''}catch(e){''}" 2>/dev/null)
  printf '%s%s%s' "${v:-}" "${v:+ · }" "${h:+lock ${h:0:12}}"
}

write_manifest() {
  local out="$VENDOR/MANIFEST.md" engine plugin bins
  engine=$(tr -d '[:space:]' < "$VENDOR/impeccable/skills/impeccable/scripts/VERSION" 2>/dev/null)
  plugin=$(node -p "try{require('$VENDOR/impeccable/.claude-plugin/plugin.json').version}catch(e){'?'}" 2>/dev/null)
  bins=$(ls "$VENDOR/impeccable/skills/impeccable/scripts/bin" 2>/dev/null | tr '\n' ' ')
  {
    echo "# Vendored sources"
    echo
    echo "Written by \`install.sh --manifest\` on $(date -u +%Y-%m-%d). \`install.sh --update\` refetches every row and rewrites this file."
    echo "install.sh installs these copies without touching the network."
    echo
    echo "| Component | Vendored at | Upstream | Version | License |"
    echo "|---|---|---|---|---|"
    echo "| design-taste-frontend | vendor/skills/design-taste-frontend | github.com/Leonxlnx/taste-skill (via \`npx skills add\`) | $(skill_meta "$VENDOR/skills/design-taste-frontend") | MIT |"
    echo "| animate | vendor/skills/animate | github.com/delphi-ai/animate-skill | $(skill_meta "$VENDOR/skills/animate") | none declared upstream |"
    echo "| gsap-framer-scroll-animation | vendor/skills/gsap-framer-scroll-animation | github.com/github/awesome-copilot | $(skill_meta "$VENDOR/skills/gsap-framer-scroll-animation") | MIT |"
    echo "| web-design-guidelines | vendor/skills/web-design-guidelines | github.com/vercel-labs/agent-skills | $(skill_meta "$VENDOR/skills/web-design-guidelines") | none declared upstream |"
    echo "| impeccable skill + agents + hook | vendor/impeccable/ | \`npx impeccable install\` release channel (impeccable.style, github.com/pbakaus/impeccable) | plugin $plugin · engine $engine · binaries: ${bins:-none} | Apache-2.0 |"
    echo "| motion (/motion skill) | vendor/skills/motion, vendor/motion/ | github.com/motiondivision/ai-kit plugins/motion | $(skill_meta "$VENDOR/skills/motion") | MIT (package.json; no LICENSE file in repo) |"
    echo "| higgsfield-generate | vendor/skills/higgsfield-generate | github.com/higgsfield-ai/skills | $(skill_meta "$VENDOR/skills/higgsfield-generate") | MIT |"
    echo "| higgsfield-brandkit | vendor/skills/higgsfield-brandkit | github.com/higgsfield-ai/skills | $(skill_meta "$VENDOR/skills/higgsfield-brandkit") | MIT |"
    echo "| DESIGN.md starting points | templates/design-md/ | github.com/rohitg00/awesome-claude-design design-md/ | 10 files, see templates/design-md/README.md | MIT |"
    echo
    echo "Notes"
    echo
    echo "- The impeccable engine binary is platform-specific. Vendored platforms: ${bins:-none}. On any other platform the launcher downloads the matching binary from GitHub releases on first use (checksum-verified), or run \`install.sh --update\` there to vendor it."
    if [[ -f "$VENDOR/impeccable/skills/impeccable/scripts/bin/darwin-arm64/impeccable" ]]; then
      echo "- sha256 of the vendored darwin-arm64 engine: $(shasum -a 256 "$VENDOR/impeccable/skills/impeccable/scripts/bin/darwin-arm64/impeccable" | cut -d' ' -f1)"
    fi
    echo "- vendor/skills-lock.json holds the content hashes the \`skills\` CLI recorded at fetch time."
    echo "- The Higgsfield skills install their CLI themselves on first use (\`curl … higgsfield-ai/cli/main/install.sh | sh\`) and need \`higgsfield auth login\` plus a paid subscription. That part cannot be vendored."
    echo "- The Motion MCP servers are hosted (https://mcp.motion.dev); the skill's best-practices/ folder works with no server at all."
  } > "$out"
  say "wrote $out"
}

# ---------------------------------------------------------------- --update

refresh_vendor() {
  need npx; need git; need curl
  local tmp; tmp=$(mktemp -d)
  say "refreshing vendor/ from the network (staging in $tmp)"
  mkdir -p "$VENDOR/skills" "$VENDOR/impeccable/skills" "$VENDOR/impeccable/agents" "$VENDOR/impeccable/hooks" "$VENDOR/impeccable/.claude-plugin" "$VENDOR/motion"

  fetch_skill() { # <repo> <skill>
    local d="$tmp/sk-$2"
    mkdir -p "$d"
    ( cd "$d" && npx -y skills add "$1" --skill "$2" -a claude-code -y </dev/null >/dev/null 2>&1 )
    if [[ -f "$d/.claude/skills/$2/SKILL.md" ]]; then
      rm -rf "$VENDOR/skills/$2" && cp -R "$d/.claude/skills/$2" "$VENDOR/skills/" && merge_lock "$d/skills-lock.json" && ok "$2"
    else
      fail "$2 (kept previous copy)"
    fi
  }
  fetch_skill Leonxlnx/taste-skill                         design-taste-frontend
  fetch_skill https://github.com/delphi-ai/animate-skill   animate
  fetch_skill https://github.com/github/awesome-copilot    gsap-framer-scroll-animation
  fetch_skill vercel-labs/agent-skills                     web-design-guidelines

  say "higgsfield-generate, higgsfield-brandkit"
  mkdir -p "$tmp/higgs"
  ( cd "$tmp/higgs" && npx -y skills add higgsfield-ai/skills --skill '*' -a claude-code -y </dev/null >/dev/null 2>&1 )
  local s
  for s in higgsfield-generate higgsfield-brandkit; do
    if [[ -f "$tmp/higgs/.claude/skills/$s/SKILL.md" ]]; then
      rm -rf "$VENDOR/skills/$s" && cp -R "$tmp/higgs/.claude/skills/$s" "$VENDOR/skills/" && ok "$s"
    else fail "$s (kept previous copy)"; fi
  done
  merge_lock "$tmp/higgs/skills-lock.json"

  say "impeccable (release channel via npx)"
  mkdir -p "$tmp/imp"
  ( cd "$tmp/imp" && npx -y impeccable install -y --project --providers=claude-code </dev/null >/dev/null 2>&1 )
  if [[ -f "$tmp/imp/.claude/skills/impeccable/SKILL.md" ]]; then
    # keep engine binaries vendored earlier for other platforms
    local oldbin="$tmp/oldbin"
    [[ -d "$VENDOR/impeccable/skills/impeccable/scripts/bin" ]] && cp -R "$VENDOR/impeccable/skills/impeccable/scripts/bin" "$oldbin"
    rm -rf "$VENDOR/impeccable/skills/impeccable"
    cp -R "$tmp/imp/.claude/skills/impeccable" "$VENDOR/impeccable/skills/"
    if [[ -d "$oldbin" ]]; then
      local p
      for p in "$oldbin"/*; do
        [[ -d "$p" && ! -d "$VENDOR/impeccable/skills/impeccable/scripts/bin/$(basename "$p")" ]] \
          && cp -R "$p" "$VENDOR/impeccable/skills/impeccable/scripts/bin/"
      done
    fi
    cp "$tmp/imp/.claude/agents/"impeccable-*.md "$VENDOR/impeccable/agents/" 2>/dev/null
    [[ -f "$tmp/imp/.claude/settings.local.json" ]] && cp "$tmp/imp/.claude/settings.local.json" "$VENDOR/impeccable/hooks/settings.project.json"
    ok "engine $(tr -d '[:space:]' < "$VENDOR/impeccable/skills/impeccable/scripts/VERSION" 2>/dev/null)"
  else
    fail "impeccable (kept previous copy)"
  fi
  if git clone -q --depth 1 https://github.com/pbakaus/impeccable "$tmp/imp-git" 2>/dev/null; then
    cp "$tmp/imp-git/plugin/.claude-plugin/plugin.json" "$VENDOR/impeccable/.claude-plugin/" 2>/dev/null
    cp "$tmp/imp-git/plugin/hooks/hooks.json" "$VENDOR/impeccable/hooks/" 2>/dev/null
    ok "plugin manifest + plugin hooks from git"
  else
    warn "git clone of pbakaus/impeccable failed; plugin.json/hooks.json kept as they were"
  fi

  say "motion (Motion AI Kit)"
  if git clone -q --depth 1 https://github.com/motiondivision/ai-kit "$tmp/ai-kit" 2>/dev/null \
     && [[ -f "$tmp/ai-kit/plugins/motion/skills/motion/SKILL.md" ]]; then
    rm -rf "$VENDOR/skills/motion" && cp -R "$tmp/ai-kit/plugins/motion/skills/motion" "$VENDOR/skills/motion"
    cp "$tmp/ai-kit/plugins/motion/mcp.json" "$tmp/ai-kit/plugins/motion/README.md" "$VENDOR/motion/" 2>/dev/null
    cp "$tmp/ai-kit/plugins/motion/agents/motion-reviewer.md" "$VENDOR/motion/" 2>/dev/null
    cp "$tmp/ai-kit/LICENSE" "$VENDOR/motion/LICENSE" 2>/dev/null
    ok "$(git -C "$tmp/ai-kit" log -1 --format=%h 2>/dev/null)"
  else
    fail "motion (kept previous copy)"
  fi

  say "DESIGN.md starting points (rohitg00/awesome-claude-design)"
  local f fam name n=0
  for f in "$HERE"/templates/design-md/*--*.md; do
    name=$(basename "$f" .md); fam="${name%%--*}"; name="${name#*--}"
    if curl -sfL "https://raw.githubusercontent.com/rohitg00/awesome-claude-design/main/design-md/$fam/$name.md" -o "$tmp/dm.md"; then
      cp "$tmp/dm.md" "$f"; n=$((n+1))
    fi
  done
  curl -sfL https://raw.githubusercontent.com/rohitg00/awesome-claude-design/main/LICENSE -o "$HERE/templates/design-md/LICENSE.rohitg00" 2>/dev/null
  ok "$n files refreshed"

  write_manifest
  rm -rf "$tmp"
}

# ---------------------------------------------------------------- install

install_all() {
  say "scope: $( (( GLOBAL )) && echo global || echo project ) → $DEST"
  [[ "$NODE_MAJOR" -ge 22 ]] || warn "tasteskill's inspector and impeccable live need Node 22+, you have $(node --version)"
  mkdir -p "$DEST" "$DEST_AGENTS"

  local s
  for s in design-taste-frontend animate gsap-framer-scroll-animation web-design-guidelines; do copy_skill "$s"; done

  say "impeccable"
  if [[ -f "$VENDOR/impeccable/skills/impeccable/SKILL.md" ]]; then
    rm -rf "$DEST/impeccable" && cp -R "$VENDOR/impeccable/skills/impeccable" "$DEST/"
    chmod +x "$DEST/impeccable/scripts/impeccable" 2>/dev/null
    chmod +x "$DEST"/impeccable/scripts/bin/*/impeccable 2>/dev/null
    cp "$VENDOR/impeccable/agents/"impeccable-*.md "$DEST_AGENTS/" 2>/dev/null
    if out=$("$DEST/impeccable/scripts/impeccable" engine-probe 2>/dev/null); then
      ok "skill + agents, $out"
    else
      ok "skill + agents"
      warn "no engine binary for this platform in vendor/. The detector and /impeccable commands will download it (checksum-verified) on first use; or run install.sh --update here to vendor it."
    fi
    if (( HOOK )); then
      if [[ -f "$VENDOR/impeccable/hooks/settings.project.json" ]]; then
        merge_hooks "$SETTINGS" "$VENDOR/impeccable/hooks/settings.project.json" "$HOOK_BIN"
      else
        warn "no hook template vendored; run install.sh --update"
      fi
    fi
  else
    fail "impeccable not in vendor/ (run install.sh --update). Plugin route inside Claude Code:"
    echo "    /plugin marketplace add pbakaus/impeccable"
    echo "    /plugin install impeccable@impeccable"
  fi

  if (( MOTION )); then
    copy_skill motion
    if (( GLOBAL )); then
      echo "  MCP (user scope), run once:"
      echo "    claude mcp add -s user --transport http motion https://mcp.motion.dev"
      echo "    claude mcp add -s user --transport http motion-plus https://mcp.motion.dev/plus   # optional, Motion+ members"
    else
      merge_mcp ".mcp.json"
    fi
  fi

  if (( HIGGS )); then
    copy_skill higgsfield-generate
    copy_skill higgsfield-brandkit
    echo "  Higgsfield needs a paid account. First use installs the CLI and asks for: higgsfield auth login"
  fi

  say "design-director"
  rm -rf "$DEST/design-director" && cp -R "$HERE/skills/design-director" "$DEST/"
  cp "$HERE/templates/anti-slop-checklist.md" "$DEST/design-director/anti-slop-checklist.md"
  cp "$HERE/templates/DESIGN-BRIEF.md" "$DEST/design-director/brief-template.md"
  mkdir -p "$DEST/design-director/design-md"
  cp "$HERE"/templates/design-md/*.md "$HERE"/templates/design-md/LICENSE.rohitg00 "$DEST/design-director/design-md/" 2>/dev/null
  ok "skill + checklist + brief template + $(ls "$DEST/design-director/design-md"/*--*.md 2>/dev/null | wc -l | tr -d ' ') DESIGN.md starting points"

  if (( ! GLOBAL )); then
    if [[ -f CLAUDE.md ]] && ! grep -q "Design rules (design-stack)" CLAUDE.md; then
      { echo; cat "$HERE/templates/CLAUDE.design.md"; } >> CLAUDE.md; say "appended design rules to CLAUDE.md"
    elif [[ ! -f CLAUDE.md ]]; then
      cp "$HERE/templates/CLAUDE.design.md" CLAUDE.md; say "CLAUDE.md created with design rules"
    fi
  fi

  browser_hint

  echo
  echo "Installed. In Claude Code:"
  echo "  1. /impeccable init            (once per project; writes PRODUCT.md)"
  echo "  2. \"run the design director\"  (it interviews you and writes DESIGN-BRIEF.md; no form to fill)"
  (( MOTION )) && echo "  Motion MCP: if /motion cannot search docs, enable the 'motion' server in your MCP settings (claude mcp list)."
}

# ---------------------------------------------------------------- main

if (( MANIFEST_ONLY )); then write_manifest; exit 0; fi
if (( UPDATE )); then refresh_vendor; fi
install_all
