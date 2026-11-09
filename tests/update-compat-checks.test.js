import { describe, it, expect } from 'vitest';
import { explainSidecar, unflaggedDrift } from '../scripts/update-compat/checks.js';

// The compatibility matrix accepts a sidecar that differs from the fresh
// install only when the difference is exactly the render of recorded answers
// no install flag can set. These fixtures stand in for the renders.

const doc = (lines) => Buffer.from(`${lines.join('\n')}\n`);
const FRESH_LINES = ['# AGENTS.md — Compat App', '```bash', 'npm install', 'npm test', '```',
  'This project does not define a dev/serve command and database migrations.'];
const RECORDED_LINES = ['# AGENTS.md — Compat App', '```bash', 'npm install', 'npm run dev', 'npm test', '```',
  'This project does not define database migrations.'];

const freshManifest = { commands: { install: 'npm install', dev: 'none', migration: 'none', test: 'npm test' } };
const recorded = { commands: { ...freshManifest.commands, dev: 'npm run dev' } };

function inputs(overrides = {}) {
  const fresh = doc(FRESH_LINES);
  const sidecar = doc(RECORDED_LINES);
  return { sidecar, fresh, freshRender: fresh, recordedRender: sidecar, recorded, freshManifest, ...overrides };
}

describe('explainSidecar: exact render of unflaggable recorded answers', () => {
  it('passes when the sidecar is the render of the recorded answers and shows the command', () => {
    expect(explainSidecar(inputs())).toBe('renders recorded answers no install flag can set: dev "npm run dev"');
  });

  it('fails when nothing unflaggable differs, whatever the renders say', () => {
    expect(explainSidecar(inputs({ recorded: freshManifest }))).toBeNull();
  });

  it('fails when the recorded command is missing from the sidecar', () => {
    const dropped = doc(RECORDED_LINES.filter((line) => line !== 'npm run dev'));
    expect(explainSidecar(inputs({ sidecar: dropped, recordedRender: dropped }))).toBeNull();
  });

  it('fails when the sidecar shows a different command than the one recorded', () => {
    const wrong = doc(RECORDED_LINES.map((line) => (line === 'npm run dev' ? 'npm start' : line)));
    expect(explainSidecar(inputs({ sidecar: wrong, recordedRender: wrong }))).toBeNull();
  });

  it('fails on an unrelated text change the recorded render does not produce', () => {
    const edited = doc(RECORDED_LINES.map((line) => (line.startsWith('This project') ? 'This project does not define a build step.' : line)));
    expect(explainSidecar(inputs({ sidecar: edited }))).toBeNull();
  });

  it('fails when the renderer does not reproduce the fresh install', () => {
    expect(explainSidecar(inputs({ freshRender: doc([...FRESH_LINES, 'extra']) }))).toBeNull();
  });

  it('fails when a render is missing', () => {
    expect(explainSidecar(inputs({ recordedRender: null }))).toBeNull();
  });

  it('names unrecorded identity from a 0.7.x manifest', () => {
    const legacy = { commands: freshManifest.commands, project: {}, stack: {} };
    const fresh = { ...freshManifest, project: { purpose: 'Compatibility matrix' }, stack: { backend: 'Node.js' } };
    const reason = explainSidecar(inputs({ recorded: legacy, freshManifest: fresh }));
    expect(reason).toBe('renders recorded answers no install flag can set: project.purpose unrecorded, stack.backend unrecorded');
  });
});

describe('unflaggedDrift', () => {
  it('ignores flaggable commands such as test', () => {
    const changed = { commands: { ...freshManifest.commands, test: 'pytest' } };
    expect(unflaggedDrift(changed, freshManifest)).toEqual([]);
  });
});
