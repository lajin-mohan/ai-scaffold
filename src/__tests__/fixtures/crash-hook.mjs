// Test-only: kill this process at a chosen apply stage (NFR-09). Loaded with
// `node --import`; shipped code never reads these variables.
import diagnosticsChannel from 'node:diagnostics_channel';
import process from 'node:process';

const stage = process.env.AIS_TEST_CRASH_STAGE;
const index = process.env.AIS_TEST_CRASH_INDEX;

diagnosticsChannel.subscribe('ais:update:apply', (event) => {
  if (event.stage !== stage) return;
  if (index !== undefined && index !== '' && String(event.index) !== index) return;
  process.kill(process.pid, 'SIGKILL');
});
