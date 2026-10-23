/**
 * PantryPilot — a self-hosted MCP server for Alexa+
 * --------------------------------------------------
 * Protocol: Model Context Protocol, Streamable HTTP transport
 * Spec version negotiated: 2025-11-25
 * Endpoint: POST /mcp  (JSON-RPC 2.0)
 * Also serves the Alexa+ simulator web app from /public.
 * Zero required dependencies — runs on plain Node 18+.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS, callTool } from './lib/tools.mjs';
import { bedrockStatus } from './lib/bedrock.mjs';

const PORT = process.env.PORT || 8787;
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PROTOCOL = '2025-11-25';

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleMcp(req, res, body) {
  let msg;
  try { msg = JSON.parse(body); }
  catch { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(rpcError(null, -32700, 'Parse error'))); }

  const { id, method, params } = msg;
  const isNotification = id === undefined;

  try {
    let result;
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'pantrypilot', title: 'PantryPilot for Alexa+', version: '1.0.0' },
          instructions: "PantryPilot knows the user's kitchen. Use check_expiry before suggest_recipe so dinners rescue food first. Use get_meal_plan for multi-day planning, get_waste_report for money/waste questions, get_nutrition_summary for protein/balance questions, and add_to_grocery_list for anything a recipe is missing.",
        };
        break;
      case 'ping':
        result = {};
        break;
      case 'tools/list':
        result = { tools: TOOLS };
        break;
      case 'tools/call':
        result = await callTool(params?.name, params?.arguments || {});
        break;
      case 'notifications/initialized':
      case 'notifications/cancelled':
        res.writeHead(202); return res.end();
      default:
        if (isNotification) { res.writeHead(202); return res.end(); }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(rpcError(id, -32601, `Method not found: ${method}`)));
    }
    if (isNotification) { res.writeHead(202); return res.end(); }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': PROTOCOL,
      'Mcp-Session-Id': 'pantrypilot-session-1',
    });
    res.end(JSON.stringify(rpcResult(id, result)));
  } catch (e) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rpcError(id ?? null, -32000, String(e.message || e))));
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => handleMcp(req, res, body));
    return;
  }
  if (url.pathname === '/mcp' && req.method === 'GET') {
    // Stateless server: no server-initiated SSE stream.
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed — this MCP server is stateless; POST JSON-RPC to /mcp' }));
  }
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, server: 'pantrypilot', protocol: PROTOCOL, tools: TOOLS.map((t) => t.name), bedrock: bedrockStatus() }));
  }

  // Static simulator app
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    const file = await readFile(join(ROOT, 'public', path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🥑 PantryPilot MCP server live on http://localhost:${PORT}`);
  console.log(`   MCP endpoint:  POST http://localhost:${PORT}/mcp  (spec ${PROTOCOL})`);
  console.log(`   Simulator:     http://localhost:${PORT}/`);
  console.log(`   Bedrock:       ${bedrockStatus()}`);
});
