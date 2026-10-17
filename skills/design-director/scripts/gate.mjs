#!/usr/bin/env node
// Design gate: the design-director steps as checks Claude Code enforces, not advice.
//
//   node gate.mjs status          the step ledger and the one NEXT step
//   node gate.mjs verify          run the impeccable detector on every UI file and record the result
//   node gate.mjs pre|post|stop   Claude Code hooks (PreToolUse, PostToolUse on AskUserQuestion, Stop).
//                                 install.sh wires them; they read the hook JSON on stdin.
//
// Evidence lives in .design/log.jsonl: the user's AskUserQuestion answers, recorded by the post
// hook from what the user picked, and detector runs recorded by `verify`. The pre hook refuses UI
// writes until the brief and the direction are approved, and refuses any other write to the log,
// to this script and to the settings that load it. An approval is bound to the sha256 of the file
// the user approved: edit the file and the approval is gone.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GLOBAL = SKILL === join(homedir(), '.claude', 'skills', 'design-director');
const SELF = `node "${join(SKILL, 'scripts', 'gate.mjs')}"`;

const UI = /\.(html?|css|scss|sass|less|jsx|tsx|vue|svelte|astro)$/i;
const UI_TOKEN = /[^\s'"`<>|;&()=]+\.(?:html?|css|scss|sass|less|jsx|tsx|vue|svelte|astro)\b/gi;
const NOT_UI = new Set(['node_modules', '.git', '.design', '.impeccable', '.taste-skill', '.claude', 'dist', 'build', 'out',
  '.next', '.nuxt', '.svelte-kit', '.vercel', '.output', '.cache', 'coverage', 'vendor']);
// shell that writes, moves or deletes files (redirects other than 2> and &>, in-place editors, interpreters)
const WRITES = /(^|[^0-9&<>])>|\btee\b|\bsed\b[^|;&]*\s-[a-zA-Z]*i|\bperl\b[^|;&]*\s-[a-zA-Z]*i|\b(cp|mv|rm|rmdir|unlink|install|rsync|ln|touch|truncate|dd|patch|shred)\b|\bgit\s+(checkout|restore|reset|clean|apply|mv|rm|stash)\b|\b(python3?|node|deno|bun|ruby|perl|php|osascript)\b/;
const SCAFFOLD = /\bcreate-[\w-]+|\b(npm|pnpm|yarn|bun)\s+create\b/;
const WRITE_TOOLS = /^(Write|Edit|MultiEdit|NotebookEdit)$/;
const MCP_WRITE = /^mcp__.*(write|edit|create|move|copy|patch|replace|insert|update|delete|remove)/i;

const IDS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q6v', 'Q7', 'Q8', 'Q9', 'P1', 'P2', 'P3', 'P4', 'OK-brief', 'OK-direction', 'OK-assets'];
const APPROVES = { 'OK-brief': 'DESIGN-BRIEF.md', 'OK-direction': 'DESIGN-DIRECTION.md', 'OK-assets': '.design/assets.md' };
const ASK = 'with AskUserQuestion';
const HOW = {
  Q1: `Ask what this is, in one concrete sentence (${ASK}, header "Q1"), or end the brief's What line with "(repo: <file>)" when the repo answers it.`,
  Q2: `Ask who uses it, in what mood or situation (${ASK}, header "Q2"), or "(repo: <file>)" on the Who line.`,
  Q3: `Ask the one job the first screen must do (${ASK}, header "Q3"), or "(repo: <file>)" on the Job line.`,
  Q4: `Ask the stack (${ASK}, header "Q4"). Only a repo file that shows it (package.json, a framework config) may answer instead: "(repo: <file>)" on the Stack line.`,
  Q5: `Ask which brand assets truly exist: logo, fonts, photos, product shots, video (${ASK}, header "Q5"), or "(repo: <dir>)" on the Assets line.`,
  Q6: `Ask for three to five references, each with WHY: type, density, motion, colour discipline, mood (${ASK}, header "Q6").`,
  Q6v: `Ask, as its own question, for optional visual references: screenshots, moodboard images, Figma / Dribbble / Pinterest links, photos of printed objects, and say none is a fine answer (${ASK}, header "Q6v"). Look at each one shared and write what you see on the brief's Visual references line.`,
  Q7: `Ask the knobs, 1 to 5 each: energy, density, motion, and the tone of voice in three words (${ASK}, header "Q7").`,
  Q8: `Read every default Forbidden item from brief-template.md to the user and ask what to add or strike (${ASK}, header "Q8").`,
  Q9: `Ask the success sentence ("When someone sees it they should think: …") and what would make them reject it even if it works (${ASK}, header "Q9").`,
  P1: `No references, so run the picker. 1/3: read-heavy or scan-heavy? (${ASK}, header "P1")`,
  P2: `Picker 2/3: the primary user, developer, designer, creator, consumer or prosumer? (${ASK}, header "P2")`,
  P3: `Picker 3/3: should it feel like it took courage, or familiar and trustworthy? (${ASK}, header "P3")`,
  P4: `Recommend ONE family from design-md/README.md, offer two of its files quoting each file's first line, and let the user pick (${ASK}, header "P4"). Write the pick on the brief's Starting point line.`,
  BRIEF: 'Write DESIGN-BRIEF.md from brief-template.md, every "Key:" line filled ("unknown" rather than inventing).',
  'OK-brief': `Show DESIGN-BRIEF.md in full, then ask for approval ${ASK}, header "OK-brief", first option = approve. A yes in prose does not count, and any later edit to the brief needs a new OK-brief.`,
  DIRECTION: 'Classify the surface and write DESIGN-DIRECTION.md from direction-template.md: Class, Taste skill, Direction, Palette, Type, Layout, Motion, States, Anti-slop Part A.',
  'OK-direction': `Show DESIGN-DIRECTION.md, then ask for approval ${ASK}, header "OK-direction", first option = approve. Changing the direction later needs a new OK-direction.`,
  CRITIQUE: 'Screenshot at 360 and 1440, critique what you see (tasteskill Look step, or /impeccable critique) and write the critique to .design/critique.md.',
  CHECKLIST: 'Copy anti-slop-checklist.md to .design/checklist.md, tick each A and C box only after checking it, and answer every B line after the arrow.',
  AUDIT: 'Run /impeccable audit and the web-design-guidelines review, and write findings and fixes under "## impeccable audit" and "## web-design-guidelines" in .design/audit.md.',
  INSPECT: "Run tasteskill's scripts/inspect.mjs after the last UI change: 0 FAIL, widths including 390 and 1440.",
  SHOTS: "After the last UI change, save screenshots to .design/shots/ with the viewport width in the name (home-360.png, home-1440.png), or rerun tasteskill's inspect.mjs.",
  DETECT: `After the last UI change run: ${SELF} verify (impeccable detector, 0 findings).`,
};

// ---------------------------------------------------------------- files

// symlinks resolved (macOS /var → /private/var), so one file never hides behind a second path;
// a file not written yet resolves through its nearest existing parent
function real(p) {
  const rest = [];
  for (let d = resolve(p); ; d = dirname(d)) {
    try { return join(realpathSync(d), ...rest.reverse()); } catch {}
    if (dirname(d) === d) return resolve(p);
    rest.push(basename(d));
  }
}

function rootOf(input = {}) {
  if (!GLOBAL) return resolve(SKILL, '..', '..', '..');
  const start = real(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  for (let d = start; ; d = dirname(d)) {
    if (existsSync(join(d, '.design'))) return d;
    if (dirname(d) === d) return start;
  }
}
// project installs always enforce; a global install enforces in projects that have a .design/ folder
const active = (root) => !GLOBAL || existsSync(join(root, '.design'));

const read = (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
const mtime = (f) => { try { return statSync(f).mtimeMs; } catch { return 0; } };
const sha = (f) => { try { return createHash('sha256').update(readFileSync(f)).digest('hex'); } catch { return null; } };

function isUi(root, file, cwd = root) {
  const rel = relative(root, real(resolve(cwd, file)));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return false;
  return UI.test(rel) && !rel.split(sep).some((p) => NOT_UI.has(p));
}

function uiFiles(root) {
  const out = [];
  const walk = (d) => {
    let ents; try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.isDirectory()) { if (!NOT_UI.has(e.name)) walk(join(d, e.name)); }
      else if (e.isFile() && UI.test(e.name)) out.push(join(d, e.name));
    }
  };
  walk(root);
  return out;
}

function isProtected(root, file, cwd = root) {
  const abs = real(resolve(cwd, file));
  return abs === join(root, '.design', 'log.jsonl') || abs.startsWith(join(SKILL, 'scripts') + sep)
    || [join(root, '.claude', 'settings.json'), join(root, '.claude', 'settings.local.json'), join(homedir(), '.claude', 'settings.json')].includes(abs);
}

const logFile = (root) => join(root, '.design', 'log.jsonl');
function readLog(root) {
  return (read(logFile(root)) || '').split('\n').flatMap((l) => { try { return l ? [JSON.parse(l)] : []; } catch { return []; } });
}
function record(root, entry) {
  mkdirSync(join(root, '.design'), { recursive: true });
  appendFileSync(logFile(root), JSON.stringify({ ...entry, at: Date.now() }) + '\n');
}

// "- Key: value" lines and the bullets of each "## section"; <!-- --> notes are template hints, not answers
function keyLines(file) {
  const text = read(file);
  if (text == null) return null;
  const keys = {}, sections = {};
  let sec = '';
  for (const line of text.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const h = line.match(/^#{2,}\s*(.+)/);
    if (h) { sec = h[1].trim().toLowerCase(); sections[sec] = []; continue; }
    const b = line.match(/^\s*-\s+(.*\S)\s*$/);
    if (!b) continue;
    (sections[sec] ||= []).push(b[1]);
    const kv = b[1].match(/^([A-Za-z][\w -]*?):\s*(.*)$/);
    if (kv) (keys[kv[1].toLowerCase()] ||= []).push(kv[2].trim());
  }
  return { keys, sections, value: (k) => (keys[k] || [''])[0] };
}
const NONE = (v) => !v || /^(none|no|yok|hay[ıi]r|unknown|bilinmiyor|n\/a|-|—)([\s.,;:—-]|$)/i.test(v.trim());

// ---------------------------------------------------------------- the ledger

function briefState(root) {
  const file = join(root, 'DESIGN-BRIEF.md');
  const p = keyLines(file);
  if (!p) return { file, problems: ['DESIGN-BRIEF.md does not exist'], repo: {} };
  const v = p.value, problems = [];
  for (const k of ['what', 'who', 'job', 'things', 'vernacular', 'visual references', 'energy', 'density', 'motion', 'tone', 'stack', 'assets', 'accessibility', 'support', 'think', 'reject']) {
    if (!v(k)) problems.push(`"${k}" is empty`);
  }
  for (const k of ['energy', 'density', 'motion']) if (v(k) && !/\b[1-5]\b/.test(v(k))) problems.push(`"${k}" needs a number from 1 to 5`);
  if (!Object.entries(p.sections).some(([s, items]) => s.startsWith('forbidden') && items.length)) problems.push('the Forbidden list is empty');
  const refs = (p.keys.reference || []).filter((r) => !NONE(r));
  const picker = !refs.length && NONE(v('visual references'));
  const start = v('starting point').match(/design-md\/([\w.-]+\.md)/);
  const startOk = !!start && existsSync(join(SKILL, 'design-md', start[1]));
  if (picker && !startOk) problems.push('there are no references, so "Starting point" must name an existing design-md/<file>.md');
  const repo = {};
  for (const [id, k] of [['Q1', 'what'], ['Q2', 'who'], ['Q3', 'job'], ['Q4', 'stack'], ['Q5', 'assets']]) {
    const m = v(k).match(/\(repo:\s*([^)]+)\)/);
    repo[id] = !!m && existsSync(join(root, m[1].trim()));
  }
  const motion = Number((v('motion').match(/\b[1-5]\b/) || ['1'])[0]);
  return { file, exists: true, problems, picker, repo, motion, startingPoint: startOk };
}

function directionState(root) {
  const file = join(root, 'DESIGN-DIRECTION.md');
  const p = keyLines(file);
  if (!p) return { file, problems: ['DESIGN-DIRECTION.md does not exist'] };
  const v = p.value, problems = [];
  for (const k of ['class', 'taste skill', 'direction', 'palette', 'type', 'layout', 'motion', 'states', 'anti-slop part a']) {
    if (!v(k)) problems.push(`"${k}" is empty`);
  }
  const cls = (v('class').toLowerCase().match(/public page|product ui|component|mixed/) || [''])[0];
  if (v('class') && !cls) problems.push('"Class" must be one of Public page, Product UI, Component, Mixed');
  if (cls) {
    const taste = v('taste skill').toLowerCase();
    const wantTaste = cls === 'public page' || cls === 'mixed', wantImp = cls !== 'public page';
    if (wantTaste !== /design-taste-frontend|tasteskill/.test(taste) || wantImp !== /impeccable/.test(taste)) {
      problems.push(`"Taste skill" for ${cls} must be ${cls === 'mixed' ? 'design-taste-frontend for public routes and impeccable for app routes' : wantTaste ? 'design-taste-frontend only' : 'impeccable only'} (one taste skill per screen)`);
    }
  }
  return { file, exists: true, problems, cls };
}

function approval(log, id, file) {
  const last = log.findLast((e) => e.t === 'answer' && e.id === id);
  return last && last.approved && (!file || last.hash === sha(file)) ? last : null;
}
const answered = (log, id) => log.some((e) => e.t === 'answer' && e.id === id && String(e.answer ?? '').trim());

function checklistProblems(file) {
  const text = read(file);
  if (text == null) return ['.design/checklist.md does not exist'];
  const boxes = text.match(/^\s*-\s*\[[ xX]\]/gm) || [];
  const want = (read(join(SKILL, 'anti-slop-checklist.md'))?.match(/^\s*-\s*\[[ xX]\]/gm) || []).length || 23;
  const problems = [];
  const open = boxes.filter((b) => !/\[[xX]\]/.test(b)).length;
  if (open) problems.push(`${open} box(es) not ticked`);
  if (boxes.length < want) problems.push(`${want - boxes.length} item(s) missing from the checklist`);
  const b = text.split(/^##\s*/m).find((s) => /^B\b/.test(s)) || '';
  const unanswered = (b.match(/^\s*-\s*\[[ xX]\].*$/gm) || []).filter((l) => !/(→|->)\s*\S/.test(l)).length;
  if (unanswered) problems.push(`${unanswered} B decision(s) without an answer after the arrow`);
  return problems;
}

function sectionHasText(text, name) {
  const part = text.split(/^#{2,}\s*/m).find((s) => s.toLowerCase().startsWith(name));
  return !!part && part.split('\n').slice(1).some((l) => l.trim());
}

function inspectReport(root) {
  const file = join(root, '.taste-skill', 'inspect', 'report.json');
  try {
    const r = JSON.parse(readFileSync(file, 'utf8'));
    const widths = (r.viewports || []).map((x) => x.width);
    return { at: mtime(file), fails: (r.findings || []).filter((f) => f.level === 'FAIL').length,
      both: widths.some((w) => w <= 430) && widths.some((w) => w >= 1280) };
  } catch { return null; }
}

function freshShots(root, after) {
  const dir = join(root, '.design', 'shots');
  let names = []; try { names = readdirSync(dir).filter((n) => /\.(png|jpe?g|webp)$/i.test(n) && mtime(join(dir, n)) > after); } catch {}
  const widths = names.flatMap((n) => (n.match(/\d{3,4}/g) || []).map(Number));
  return widths.some((w) => w >= 320 && w <= 430) && widths.some((w) => w >= 1280);
}

export function evaluate(root, { finish = true } = {}) {
  const log = readLog(root);
  const b = briefState(root), d = directionState(root);
  const steps = [];
  const add = (phase, id, done, how, required = true) => steps.push({ phase, id, done: !!done, required, how });

  for (const id of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']) add('brief', id, answered(log, id) || b.repo[id], HOW[id]);
  for (const id of ['Q6', 'Q6v', 'Q7', 'Q8', 'Q9']) add('brief', id, answered(log, id), HOW[id]);
  for (const id of ['P1', 'P2', 'P3', 'P4']) add('brief', id, answered(log, id), HOW[id], !!b.picker);
  add('brief', 'BRIEF', b.exists && !b.problems.length, `${HOW.BRIEF} Problems: ${b.problems.join('; ')}.`);
  add('brief', 'OK-brief', approval(log, 'OK-brief', b.file), HOW['OK-brief']);

  add('direction', 'DIRECTION', d.exists && !d.problems.length, `${HOW.DIRECTION} Problems: ${d.problems.join('; ')}.`);
  const route = [];
  if (['public page', 'mixed'].includes(d.cls) && !existsSync(join(root, '.taste-skill', 'direction.json'))) {
    route.push('deal the direction with design-taste-frontend (scripts/draw.mjs); .taste-skill/direction.json is missing');
  }
  if (['product ui', 'mixed'].includes(d.cls) && !existsSync(join(root, 'PRODUCT.md'))) route.push('run /impeccable init; PRODUCT.md is missing');
  if (['product ui', 'component', 'mixed'].includes(d.cls) && b.startingPoint && !existsSync(join(root, 'DESIGN.md'))) {
    route.push("copy the brief's starting point to ./DESIGN.md and edit its tokens to the Forbidden list");
  }
  add('direction', 'ROUTE', d.cls && !route.length, d.cls ? `Route the work: ${route.join('; ')}.` : 'Write the Class in DESIGN-DIRECTION.md first.');
  const okDir = approval(log, 'OK-direction', d.file);
  add('direction', 'OK-direction', okDir, HOW['OK-direction']);

  const designed = steps.every((s) => s.done || !s.required);
  const state = { steps, designed, started: !!(b.exists || log.length), built: false, cls: d.cls };
  if (finish) {
    const ui = uiFiles(root);
    const lastUi = ui.reduce((m, f) => Math.max(m, mtime(f)), 0);
    const since = okDir ? okDir.at : Infinity;
    const built = designed && lastUi > since;
    const fresh = (f) => mtime(join(root, '.design', f)) > since;
    const dsg = (f) => read(join(root, '.design', f)) || '';
    const pub = ['public page', 'mixed'].includes(d.cls);

    add('finish', 'CRITIQUE', fresh('critique.md') && dsg('critique.md').split('\n').filter((l) => l.trim()).length >= 3, HOW.CRITIQUE, built);
    const cl = checklistProblems(join(root, '.design', 'checklist.md'));
    add('finish', 'CHECKLIST', fresh('checklist.md') && !cl.length, `${HOW.CHECKLIST} Problems: ${cl.join('; ') || 'written before the direction was approved'}.`, built);
    add('finish', 'MOTION', b.motion <= 1 || ui.some((f) => (read(f) || '').includes('prefers-reduced-motion')),
      `The brief's Motion knob is ${b.motion}: build the motion step (director step 4) and honour prefers-reduced-motion in the UI code.`, built && b.motion > 1);
    const assets = dsg('assets.md');
    const rows = assets.split('\n').filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l)).slice(1);
    const generate = rows.some((r) => /generat/i.test(r.split('|').map((c) => c.trim()).filter(Boolean).pop() || ''));
    const assetProblems = [];
    if (!fresh('assets.md')) assetProblems.push('.design/assets.md is missing');
    if (generate && !approval(log, 'OK-assets')) assetProblems.push('rows marked "generate" need OK-assets first');
    if (pub && !/1200\s*[×x]\s*630/.test(assets)) assetProblems.push('a public page needs the OG image row (1200×630)');
    add('finish', 'ASSETS', !assetProblems.length,
      `Write the slot table to .design/assets.md (director step 4b), Status column real / stand-in / generate / generated. Rows to generate need approval first: AskUserQuestion, header "OK-assets", first option = approve. Problems: ${assetProblems.join('; ')}.`, built);
    add('finish', 'AUDIT', fresh('audit.md') && sectionHasText(dsg('audit.md'), 'impeccable audit') && sectionHasText(dsg('audit.md'), 'web-design-guidelines'), HOW.AUDIT, built);
    const ins = inspectReport(root);
    add('finish', 'INSPECT', ins && ins.at > lastUi && !ins.fails && ins.both, HOW.INSPECT, built && pub);
    add('finish', 'SHOTS', freshShots(root, lastUi) || (ins && ins.at > lastUi && ins.both), HOW.SHOTS, built);
    const v = log.findLast((e) => e.t === 'verify');
    add('finish', 'DETECT', v && v.ok && v.uiStamp >= lastUi, HOW.DETECT, built);
    Object.assign(state, { built, lastUi, ui });
  }
  state.next = steps.find((s) => s.required && !s.done) || null;
  return state;
}

function ledger(root, s) {
  const mark = (x) => (x.done ? '✓' : x.required ? '✗' : '·') + x.id;
  const lines = [`design gate · ${GLOBAL ? 'global' : 'project'} install · ${root}`];
  if (!active(root)) lines.push('Not enforcing here: a global install enforces only in projects with a .design/ folder. Create it to start the flow.');
  for (const ph of ['brief', 'direction', 'finish']) lines.push(`  ${ph.padEnd(10)}${s.steps.filter((x) => x.phase === ph).map(mark).join(' ')}`);
  lines.push('  ✓ done  ✗ open  · not required yet');
  if (s.next) lines.push(`NEXT ${s.next.id}: ${s.next.how}`);
  else if (s.built) lines.push('Every step has its evidence. Write the report (director step 6) and paste this ledger into it.');
  else lines.push('Brief and direction are approved: build (director step 2). UI files are unlocked.');
  return lines.join('\n');
}

// ---------------------------------------------------------------- hooks

const out = (o) => process.stdout.write(JSON.stringify(o));
const deny = (reason) => out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
const stepId = (header) => {
  const h = String(header || '').trim().split(/\s/)[0].toLowerCase();
  return IDS.find((id) => id.toLowerCase() === h) || null;
};
function blocked(what, s) {
  const open = s.steps.filter((x) => x.required && !x.done).map((x) => x.id);
  return `design gate: ${what} is UI work, and the design director's steps before it are not done (${open.join(', ')}). `
    + `NEXT ${s.next.id}: ${s.next.how} Do the steps in order; never work around this gate. Full ledger: ${SELF} status`;
}

function pre(input) {
  const root = rootOf(input);
  if (!active(root)) return;
  const name = input.tool_name || '', ti = input.tool_input || {}, cwd = input.cwd || root;

  if (name === 'AskUserQuestion') {
    if (ti.answers && Object.keys(ti.answers).length) return deny('design gate: AskUserQuestion answers come from the user. Send the questions without an "answers" field.');
    for (const q of ti.questions || []) {
      const id = stepId(q.header);
      if (!id?.startsWith('OK-')) continue;
      if (q.multiSelect || (q.options || []).length < 2) return deny(`design gate: ${id} is a single-choice question whose first option approves and whose second asks for changes.`);
      const s = evaluate(root, { finish: false });
      const at = s.steps.findIndex((x) => x.id === id);
      const before = (at < 0 ? s.steps : s.steps.slice(0, at)).filter((x) => x.required && !x.done);
      if (before.length) return deny(`design gate: do not ask ${id} yet; open before it: ${before.map((x) => x.id).join(', ')}. NEXT ${before[0].id}: ${before[0].how}`);
      if (id === 'OK-assets' && !existsSync(join(root, '.design', 'assets.md'))) return deny('design gate: write the slot table to .design/assets.md before asking OK-assets.');
    }
    return;
  }

  if (name === 'Bash') {
    const cmd = String(ti.command || '');
    if (/gate\.mjs["']?\s+(pre|post|stop)\b/.test(cmd)) return deny('design gate: the gate hooks run only from Claude Code itself. Use gate.mjs status or gate.mjs verify.');
    const rest = cmd.replace(/[^\s"']*gate\.mjs["']?\s+(status|verify)\b/g, '');
    if (!WRITES.test(rest) && !SCAFFOLD.test(rest)) return;
    if (/log\.jsonl|\.design[\\/]+log|gate\.mjs|design-director[\\/]scripts/.test(rest) || (/\.claude\b/.test(rest) && /settings(\.local)?\.json/.test(rest))) {
      return deny('design gate: that command touches the gate\'s evidence log, its script or the settings that load it. Those change only by the user\'s own hand.');
    }
    const ui = (rest.match(UI_TOKEN) || []).map((t) => t.replace(/^['"]|['"]$/g, '')).filter((t) => isUi(root, t, cwd));
    if (ui.length || SCAFFOLD.test(rest)) {
      const s = evaluate(root, { finish: false });
      if (!s.designed) return deny(blocked(ui[0] || 'project scaffolding', s));
    }
    return;
  }

  if (!WRITE_TOOLS.test(name) && !MCP_WRITE.test(name)) return;
  const targets = WRITE_TOOLS.test(name) ? [ti.file_path, ti.notebook_path].filter(Boolean) : JSON.stringify(ti).match(/[^"\s]+\.[\w]+/g) || [];
  for (const t of targets) {
    if (isProtected(root, t, cwd)) return deny(`design gate: ${t} is the gate's own evidence or wiring. It changes only by the user's own hand.`);
  }
  const ui = targets.filter((t) => isUi(root, t, cwd));
  if (ui.length) {
    const s = evaluate(root, { finish: false });
    if (!s.designed) return deny(blocked(relative(root, resolve(cwd, ui[0])), s));
  }
}

function answersOf(input) {
  for (const src of [input.tool_response, input.tool_input]) {
    if (src && typeof src === 'object' && src.answers && typeof src.answers === 'object') return src.answers;
  }
  const text = typeof input.tool_response === 'string' ? input.tool_response : JSON.stringify(input.tool_response ?? '');
  const found = {};
  for (const m of text.matchAll(/"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g)) found[m[1]] = m[2];
  return found;
}

function post(input) {
  if (input.tool_name !== 'AskUserQuestion') return;
  const root = rootOf(input);
  if (!active(root)) return;
  const answers = answersOf(input), notes = [];
  for (const q of input.tool_input?.questions || []) {
    const id = stepId(q.header), answer = answers[q.question];
    if (!id || answer == null || !String(answer).trim()) continue;
    const e = { t: 'answer', id, question: q.question, options: (q.options || []).map((o) => o.label), answer: String(answer) };
    if (APPROVES[id]) {
      e.approved = e.answer === e.options[0];
      e.hash = sha(join(root, APPROVES[id]));
      notes.push(e.approved ? `${id} approved; it holds while ${APPROVES[id]} stays as it is now.` : `${id} not approved: apply the user's corrections to ${APPROVES[id]} and ask ${id} again.`);
    }
    record(root, e);
  }
  if (notes.length) out({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `design gate: ${notes.join(' ')}` } });
}

function stop(input) {
  const root = rootOf(input);
  if (!active(root)) return;
  const s = evaluate(root);
  if (!s.started || !s.next) return;
  const done = s.steps.filter((x) => x.required && x.done).length, all = s.steps.filter((x) => x.required).length;
  const line = `design gate · ${done}/${all} steps · next: ${s.next.id}`;
  // one push back per turn when the next move is an approval or the finish; a second stop goes through
  if (!input.stop_hook_active && (s.built || s.next.id.startsWith('OK-'))) {
    return out({ decision: 'block', reason: `${line}. ${s.next.how} If you are waiting for the user's answer, stop again.` });
  }
  out({ systemMessage: line });
}

// ---------------------------------------------------------------- main

const [cmd] = process.argv.slice(2);
// imported (the vibe gate reads evaluate()) rather than run: no CLI, no side effects
let entry = null; try { entry = realpathSync(process.argv[1]); } catch {}
if (entry !== realpathSync(fileURLToPath(import.meta.url))) {
  // nothing to run
} else if (['pre', 'post', 'stop'].includes(cmd)) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
  try { ({ pre, post, stop })[cmd](input); }
  catch (e) {
    // fail closed: a broken gate must not wave UI work through
    const name = input.tool_name || '', c = String(input.tool_input?.command || '');
    if (cmd === 'pre' && (WRITE_TOOLS.test(name) || MCP_WRITE.test(name) || (name === 'Bash' && (UI_TOKEN.test(c) || /log\.jsonl|gate\.mjs|settings/.test(c))))) {
      deny(`design gate error: ${e.message}. Writes stay blocked until the gate works; tell the user.`);
    } else process.stderr.write(`design gate: ${e.message}\n`);
  }
} else if (cmd === 'status') {
  const root = rootOf();
  console.log(ledger(root, evaluate(root)));
} else if (cmd === 'verify') {
  const root = rootOf();
  const ui = uiFiles(root);
  const bin = join(SKILL, '..', 'impeccable', 'scripts', 'impeccable');
  if (!ui.length) { console.log('verify: no UI files yet.'); process.exit(1); }
  if (!existsSync(bin)) { console.log(`verify: the impeccable detector is not installed at ${bin}; run install.sh.`); process.exit(1); }
  const r = spawnSync(bin, ['detect', '--json', ...ui], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  let findings = null; try { findings = JSON.parse(r.stdout).length; } catch {}
  const ok = r.status === 0 && findings === 0;
  record(root, { t: 'verify', ok, findings, uiStamp: ui.reduce((m, f) => Math.max(m, mtime(f)), 0) });
  console.log(ok ? `verify: detector clean on ${ui.length} UI file(s).` : `verify: detector reports ${findings ?? 'an error'} finding(s); fix them and verify again.\n${(r.stdout || r.stderr || '').slice(0, 4000)}`);
  console.log(ledger(root, evaluate(root)));
  process.exit(ok ? 0 : 1);
} else {
  console.log('usage: node gate.mjs status | verify      (pre | post | stop are Claude Code hooks)');
  process.exit(cmd ? 2 : 0);
}
