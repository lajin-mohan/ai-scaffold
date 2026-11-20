import fs from 'fs';
import path from 'path';

// Wrong for every input the prompt specifies: never discounts, never throws,
// and returns -1 even for an empty cart. A test that asserts anything the
// prompt asks for fails against it. The agent's other exports are not kept,
// so a test that imports a helper fails to load; that is reported as
// inconclusive, not as a caught mutant.
const MUTANT = '\nexport function applyDiscount() {\n  return -1;\n}\n';
const LOAD_FAILURE = /does not provide an export named|SyntaxError|ERR_MODULE_NOT_FOUND/;

function agentTestFiles(dir) {
  const testDir = path.join(dir, 'test');
  if (!fs.existsSync(testDir)) return [];
  return fs.readdirSync(testDir, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith('.js') && fs.readFileSync(path.join(testDir, name), 'utf8').includes('applyDiscount'));
}

/** Runs the agent's tests against the mutant; restores src/cart.js whatever happens. */
function mutantVerdict({ dir, run, seedFile }) {
  const cart = path.join(dir, 'src/cart.js');
  const original = fs.readFileSync(cart);
  try {
    fs.writeFileSync(cart, seedFile('src/cart.js') + MUTANT);
    const result = run('node', ['--test']);
    if (result.status === 0) return 'the agent\'s tests still pass against a wrong applyDiscount';
    if (LOAD_FAILURE.test(`${result.stdout}${result.stderr}`)) return 'mutation check inconclusive: the agent\'s tests import something beyond subtotal and applyDiscount';
    return null;
  } finally {
    fs.writeFileSync(cart, original);
  }
}

export default function check({ dir, taskDir, run, seedFile }) {
  const reasons = [];
  if (run('node', ['--test']).status !== 0) reasons.push('the test suite fails');
  if (agentTestFiles(dir).length === 0) {
    reasons.push('no test under test/ calls applyDiscount');
  } else {
    const mutant = mutantVerdict({ dir, run, seedFile });
    if (mutant) reasons.push(mutant);
  }
  fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
  fs.copyFileSync(path.join(taskDir, 'hidden/cart.hidden.test.js'), path.join(dir, 'test/cart.hidden.test.js'));
  if (run('node', ['--test', 'test/cart.hidden.test.js']).status !== 0) reasons.push('hidden applyDiscount tests fail');
  return { pass: reasons.length === 0, reasons };
}
