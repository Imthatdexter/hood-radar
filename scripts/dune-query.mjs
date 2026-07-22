// Dev helper: run ad-hoc SQL on Dune and print result rows + execution metadata.
// Usage: DUNE_API_KEY=... node scripts/dune-query.mjs "SELECT ..."
import { setTimeout as sleep } from 'node:timers/promises';

const sql = process.argv[2];
const key = process.env.DUNE_API_KEY;
const performance = process.env.DUNE_PERF || 'medium';
const base = 'https://api.dune.com/api/v1';

if (!sql || !key) {
  console.error('Usage: DUNE_API_KEY=... node scripts/dune-query.mjs "SELECT ..."');
  process.exit(2);
}

const headers = { 'X-Dune-Api-Key': key, 'Content-Type': 'application/json' };

const submit = await fetch(`${base}/sql/execute`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ sql, performance }),
});
if (!submit.ok) {
  console.error('submit failed', submit.status, await submit.text());
  process.exit(1);
}
const { execution_id } = await submit.json();
process.stderr.write(`submitted ${execution_id} ... `);

let state = null;
let meta = null;
for (let i = 0; i < 90; i++) {
  await sleep(2000);
  const s = await (await fetch(`${base}/execution/${execution_id}`, { headers })).json();
  state = s.state;
  meta = s;
  if (state === 'QUERY_STATE_COMPLETED') break;
  if (/FAILED|EXPIRED|CANCELLED|ERROR/.test(state || '')) {
    process.stderr.write(`\nquery failed: ${state}\n${JSON.stringify(s, null, 2)}\n`);
    process.exit(1);
  }
  process.stderr.write('.');
}
process.stderr.write(` done (${state})\n`);

const r = await (await fetch(`${base}/execution/${execution_id}/results`, { headers })).json();
const rows = r?.result?.rows ?? [];
const tm = r?.result?.metadata ?? meta ?? {};
console.log(
  JSON.stringify(
    {
      rows,
      rowcount: rows.length,
      execution_ms: meta?.execution_ms ?? meta?.time_started,
      cost_credits: tm.execution_cost_credits ?? meta?.execution_cost_credits,
      state,
    },
    null,
    2,
  ),
);
