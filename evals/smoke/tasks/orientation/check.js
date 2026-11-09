export default function check({ finalText, run }) {
  const reasons = [];
  if (!/npm (run )?test/.test(finalText)) reasons.push('answer does not name npm test');
  if (!/\btest\//.test(finalText)) reasons.push('answer does not name the test/ folder');
  if (run('git', ['status', '--porcelain']).stdout.trim() !== '') reasons.push('files were changed');
  return { pass: reasons.length === 0, reasons };
}
