// node --test tests/gate.test.mjs
// Drives skills/design-director/scripts/gate.mjs the way Claude Code does: hook JSON on stdin,
// installed inside a throwaway project, one full brief → direction → build → finish run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..');

function project() {
  const root = mkdtempSync(join(tmpdir(), 'gate-'));
  const skill = join(root, '.claude', 'skills', 'design-director');
  mkdirSync(join(skill, 'scripts'), { recursive: true });
  cpSync(join(REPO, 'skills', 'design-director', 'scripts', 'gate.mjs'), join(skill, 'scripts', 'gate.mjs'));
  cpSync(join(REPO, 'templates', 'anti-slop-checklist.md'), join(skill, 'anti-slop-checklist.md'));
  cpSync(join(REPO, 'templates', 'design-md'), join(skill, 'design-md'), { recursive: true });
  const gate = join(skill, 'scripts', 'gate.mjs');
  const run = (args, input) => spawnSync('node', [gate, ...args], { input: input && JSON.stringify({ cwd: root, ...input }), encoding: 'utf8' });
  const hook = (event, input) => { const r = run([event], input); assert.equal(r.status, 0, r.stderr); return r.stdout ? JSON.parse(r.stdout) : null; };
  const denied = (input) => hook('pre', input)?.hookSpecificOutput?.permissionDecision === 'deny';
  const write = (rel, text, at = Date.now() / 1000 + 5) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
    utimesSync(join(root, rel), at, at);
  };
  // payload shape copied from a real AskUserQuestion result: the model sends only `questions`,
  // the tool returns { questions, answers: { <question text>: <picked label> } }
  const answer = (header, label, options = ['Approve', 'Change something']) => {
    const question = `${header}?`;
    const questions = [{ question, header, options: options.map((l) => ({ label: l, description: '' })), multiSelect: false }];
    hook('post', { hook_event_name: 'PostToolUse', tool_name: 'AskUserQuestion', tool_input: { questions },
      tool_response: { questions, answers: { [question]: label } } });
  };
  const status = () => run(['status']).stdout;
  return { root, hook, denied, write, answer, status };
}

const BRIEF = `# Design Brief
## Subject
- What: an interactive chart of the 44 English phonemes
- Who: Turkish learners on their phones
- Job: show that a symbol is a sound
## World
- Things: spectrogram, mouth cross-section (inferred)
- Vernacular: phoneme, minimal pair (inferred)
## References
- Reference: none
- Visual references: none
- Starting point: STARTING
## Direction knobs
- Energy: 4
- Density: 3
- Motion: 4
- Tone: bold, lively, playful
## Hard constraints
- Stack: static HTML/CSS/JS
- Assets: none
- Accessibility: WCAG AA, keyboard, reduced motion
- Support: mobile first, dark
## Forbidden
- Inter / Arial / system-ui as display font
## Success
- Think: "this is an instrument"
- Reject: looks like a toy
`;

const DIRECTION = (cls, taste) => `# Design Direction
- Class: ${cls}
- Taste skill: ${taste}
- Direction: the official IPA geometry
- Palette: near-black ground, off-white text; colour refused
- Type: Noto Sans Mono 12/14/16/20/28/40, display 96
- Layout: 8px grid; the vowel trapezoid breaks it
- Motion: selecting a sound traces its axes
- States: speaking, no voice, loading voices
- Anti-slop Part A: none of the ten tells in the plan
`;

test('UI work is refused until the brief and the direction are approved', () => {
  const p = project();
  assert.ok(p.denied({ tool_name: 'Write', tool_input: { file_path: join(p.root, 'index.html'), content: 'x' } }));
  assert.ok(p.denied({ tool_name: 'Bash', tool_input: { command: "cat > index.html <<'EOF'\n<h1>x</h1>\nEOF" } }));
  assert.ok(p.denied({ tool_name: 'Bash', tool_input: { command: 'npx create-next-app@15 web' } }));
  assert.ok(!p.denied({ tool_name: 'Bash', tool_input: { command: 'grep -n h1 index.html 2>/dev/null' } }));
  assert.ok(!p.denied({ tool_name: 'Write', tool_input: { file_path: join(p.root, 'DESIGN-BRIEF.md'), content: 'x' } }));
  assert.ok(!p.denied({ tool_name: 'Write', tool_input: { file_path: join(p.root, '.impeccable', 'mocks', 'a.html'), content: 'x' } }));
  const reason = p.hook('pre', { tool_name: 'Edit', tool_input: { file_path: 'src/App.tsx' } }).hookSpecificOutput.permissionDecisionReason;
  assert.match(reason, /NEXT Q1/);
});

test('the evidence log, the gate and its settings are off limits to the model', () => {
  const p = project();
  assert.ok(p.denied({ tool_name: 'Write', tool_input: { file_path: join(p.root, '.design', 'log.jsonl'), content: '{}' } }));
  assert.ok(p.denied({ tool_name: 'Edit', tool_input: { file_path: join(p.root, '.claude', 'settings.json') } }));
  assert.ok(p.denied({ tool_name: 'Write', tool_input: { file_path: join(p.root, '.claude', 'skills', 'design-director', 'scripts', 'gate.mjs') } }));
  assert.ok(p.denied({ tool_name: 'Bash', tool_input: { command: `echo '{"t":"answer"}' >> .design/log.jsonl` } }));
  assert.ok(p.denied({ tool_name: 'Bash', tool_input: { command: 'echo {} | node .claude/skills/design-director/scripts/gate.mjs post' } }));
  assert.ok(p.denied({ tool_name: 'Bash', tool_input: { command: 'cd .claude && sed -i "" s/gate// settings.json' } }));
  assert.ok(!p.denied({ tool_name: 'Bash', tool_input: { command: `node "${p.root}/.claude/skills/design-director/scripts/gate.mjs" status` } }));
});

test('answers come from the user, and approvals wait for every step before them', () => {
  const p = project();
  assert.ok(p.denied({ tool_name: 'AskUserQuestion', tool_input: { questions: [{ header: 'Q1', question: 'What?', options: [{ label: 'a' }, { label: 'b' }] }], answers: { 'What?': 'a' } } }));
  const early = p.hook('pre', { tool_name: 'AskUserQuestion', tool_input: { questions: [{ header: 'OK-brief', question: 'Approve?', options: [{ label: 'Yes' }, { label: 'No' }] }] } });
  assert.match(early.hookSpecificOutput.permissionDecisionReason, /do not ask OK-brief yet.*Q1/);
});

test('a full run: interview, picker, approvals bound to content, build, finish evidence', () => {
  const p = project();
  for (const id of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9']) p.answer(id, 'an answer', ['an answer', 'other']);
  assert.match(p.status(), /NEXT Q6v/);                                  // the visual-references question cannot be folded away
  p.answer('Q6v', 'none', ['none', 'I will paste them']);
  p.write('DESIGN-BRIEF.md', BRIEF.replace('STARTING', 'unknown'));
  assert.match(p.status(), /NEXT P1/);                                   // no references → the picker is required
  for (const id of ['P1', 'P2', 'P3', 'P4']) p.answer(id, 'x', ['x', 'y']);
  assert.match(p.status(), /NEXT BRIEF.*Starting point/);
  p.write('DESIGN-BRIEF.md', BRIEF.replace('STARTING', 'design-md/terminal--ollama.md → take palette roles'));
  assert.match(p.status(), /NEXT OK-brief/);
  p.answer('OK-brief', 'Change something');                              // a correction is not a yes
  assert.match(p.status(), /NEXT OK-brief/);
  p.answer('OK-brief', 'Approve');
  assert.match(p.status(), /NEXT DIRECTION/);
  p.write('DESIGN-BRIEF.md', BRIEF.replace('STARTING', 'design-md/terminal--ollama.md → take palette roles, mono'));
  assert.match(p.status(), /NEXT OK-brief/);                             // edited after the yes → needs a new yes
  p.answer('OK-brief', 'Approve');

  p.write('DESIGN-DIRECTION.md', DIRECTION('Product UI', 'design-taste-frontend'));
  assert.match(p.status(), /NEXT DIRECTION.*one taste skill per screen/);
  p.write('DESIGN-DIRECTION.md', DIRECTION('Product UI', 'impeccable'));
  assert.match(p.status(), /NEXT ROUTE.*PRODUCT\.md.*DESIGN\.md/);
  p.write('PRODUCT.md', '# Product');
  p.write('DESIGN.md', '# Design');
  assert.ok(p.denied({ tool_name: 'Write', tool_input: { file_path: join(p.root, 'index.html'), content: 'x' } }));
  p.answer('OK-direction', 'Approve');
  assert.ok(!p.denied({ tool_name: 'Write', tool_input: { file_path: join(p.root, 'index.html'), content: 'x' } }));

  p.write('index.html', '<h1>IPA</h1>', Date.now() / 1000 + 10);
  const stop = p.hook('stop', { stop_hook_active: false });
  assert.equal(stop.decision, 'block');
  assert.match(stop.reason, /next: CRITIQUE/);
  assert.match(p.hook('stop', { stop_hook_active: true }).systemMessage, /next: CRITIQUE/);

  const later = Date.now() / 1000 + 20;
  p.write('.design/critique.md', 'hero reads as a table\nfocus ring missing\nfixed both', later);
  const ticked = readFileSync(join(p.root, '.claude', 'skills', 'design-director', 'anti-slop-checklist.md'), 'utf8')
    .replaceAll('- [ ]', '- [x]').replace(/→$/gm, '→ answered');
  p.write('.design/checklist.md', ticked, later);
  assert.match(p.status(), /NEXT MOTION/);                               // Motion knob 4 → reduced-motion handling must exist
  p.write('index.html', '<style>@media (prefers-reduced-motion: reduce){*{transition:none}}</style><h1>IPA</h1>', later);
  p.write('.design/assets.md', '| Slot | Size | Status |\n|---|---|---|\n| symbol display | 96px | stand-in |\n', later + 1);
  p.write('.design/audit.md', '## impeccable audit\n- 0 issues\n## web-design-guidelines\n- focus fixed\n', later + 1);
  p.write('.design/shots/home-390.png', 'png', later + 1);
  p.write('.design/shots/home-1440.png', 'png', later + 1);
  assert.match(p.status(), /NEXT DETECT/);
  appendFileSync(join(p.root, '.design', 'log.jsonl'), JSON.stringify({ t: 'verify', ok: true, findings: 0, uiStamp: later * 1000, at: Date.now() }) + '\n');
  assert.match(p.status(), /Every step has its evidence/);
  assert.equal(p.hook('stop', { stop_hook_active: false }), null);

  p.write('index.html', '<h1>IPA!</h1><style>@media (prefers-reduced-motion: reduce){}</style>', later + 30);
  assert.match(p.status(), /NEXT SHOTS/);                                // any UI change reopens screenshots and the detector
});
