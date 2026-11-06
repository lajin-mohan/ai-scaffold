import fs from 'fs';
import path from 'path';

export default function check({ dir, taskDir, run, seedFile }) {
  const reasons = [];
  const visible = 'test/slugify.test.js';
  if (fs.readFileSync(path.join(dir, visible), 'utf8') !== seedFile(visible)) reasons.push('visible test file was changed');
  fs.copyFileSync(path.join(taskDir, 'hidden/slugify.hidden.test.js'), path.join(dir, 'test/slugify.hidden.test.js'));
  if (run('node', ['--test']).status !== 0) reasons.push('visible or hidden tests fail');
  return { pass: reasons.length === 0, reasons };
}
