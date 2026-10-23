// Smoke test for the PantryPilot MCP server — run with: npm test (server must NOT be running; this spawns one)
import { spawn } from 'node:child_process';

const BASE = 'http://localhost:8799';
const srv = spawn('node', ['server.mjs'], { env: { ...process.env, PORT: '8799' }, stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let id = 0;
async function rpc(method, params) {
  const r = await fetch(BASE + '/mcp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  return r.json();
}
try {
  await wait(900);
  const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  console.assert(init.result.protocolVersion === '2025-11-25', 'protocol');
  console.log('✓ initialize →', init.result.serverInfo.name, init.result.protocolVersion);
  const list = await rpc('tools/list');
  console.log('✓ tools/list →', list.result.tools.map((t) => t.name).join(', '));
  const call = await rpc('tools/call', { name: 'check_expiry', arguments: { withinDays: 3 } });
  console.log('✓ tools/call check_expiry →', JSON.parse(call.result.content[0].text).summary);
  const rec = await rpc('tools/call', { name: 'suggest_recipe', arguments: {} });
  console.log('✓ tools/call suggest_recipe → top pick:', JSON.parse(rec.result.content[0].text).topPick.name);
  const waste = await rpc('tools/call', { name: 'get_waste_report', arguments: {} });
  const w = JSON.parse(waste.result.content[0].text);
  console.log('✓ tools/call get_waste_report → at-risk $' + w.atRiskValueCAD, '| waste score', w.wasteScore);
  const plan = await rpc('tools/call', { name: 'get_meal_plan', arguments: { days: 5 } });
  console.log('✓ tools/call get_meal_plan →', JSON.parse(plan.result.content[0].text).plan.length, 'dinners planned');
  const nut = await rpc('tools/call', { name: 'get_nutrition_summary', arguments: {} });
  console.log('✓ tools/call get_nutrition_summary →', JSON.parse(nut.result.content[0].text).totalItems, 'items tracked');
  console.log('SMOKE TEST PASSED');
} finally { srv.kill(); }
