import fs from 'fs';
import path from 'path';

function agentTestsCallApplyDiscount(dir) {
  const testDir = path.join(dir, 'test');
  if (!fs.existsSync(testDir)) return false;
  return fs.readdirSync(testDir, { recursive: true })
    .filter((name) => String(name).endsWith('.js'))
    .some((name) => fs.readFileSync(path.join(testDir, String(name)), 'utf8').includes('applyDiscount'));
}

export default function check({ dir, taskDir, run }) {
  const reasons = [];
  if (run('node', ['--test']).status !== 0) reasons.push('the test suite fails');
  if (!agentTestsCallApplyDiscount(dir)) reasons.push('no test under test/ calls applyDiscount');
  fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
  fs.copyFileSync(path.join(taskDir, 'hidden/cart.hidden.test.js'), path.join(dir, 'test/cart.hidden.test.js'));
  if (run('node', ['--test', 'test/cart.hidden.test.js']).status !== 0) reasons.push('hidden applyDiscount tests fail');
  return { pass: reasons.length === 0, reasons };
}
