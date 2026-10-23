let rpcId = 0;

// --- Real MCP client (Streamable HTTP, JSON-RPC 2.0) ---
async function mcp(method, params) {
  const res = await fetch('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}
const callTool = async (name, args = {}) =>
  JSON.parse((await mcp('tools/call', { name, arguments: args })).content[0].text);

// --- UI helpers ---
const chat = document.getElementById('chat');
function bubble(who, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerHTML = `<strong>${who === 'user' ? 'You' : 'Alexa+'}</strong><p></p>`;
  d.querySelector('p').textContent = text;
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
  return d;
}
function toolCard(name, args, result) {
  const d = document.createElement('div');
  d.className = 'msg tool';
  d.innerHTML = `<strong>🔧 MCP → ${name}</strong><pre></pre>`;
  d.querySelector('pre').textContent =
    `args: ${JSON.stringify(args)}\n← ${JSON.stringify(result, null, 1).slice(0, 900)}`;
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}
const $ = (id) => document.getElementById(id);

async function refreshPanels() {
  const inv = await callTool('get_inventory', {});
  $('inventory').innerHTML = inv.items.map((i) => {
    const cls = i.daysLeft <= 1 ? 'today' : i.daysLeft <= 5 ? 'soon' : 'ok';
    const label = i.daysLeft <= 0 ? 'today!' : `${i.daysLeft}d left`;
    return `<li><span>${i.name} <small>${i.qty} ${i.unit} · $${i.price ?? ''}</small></span><span class="tag ${cls}">${label}</span></li>`;
  }).join('');
  const g = await callTool('get_grocery_list', {});
  $('grocery').innerHTML = g.groceryList
    .map((i) => `<li><span>${i.name}</span><span class="tag">×${i.qty}</span></li>`).join('') || '<li>List is empty</li>';
  const plan = await callTool('get_meal_plan', { days: 5 });
  $('mealplan').innerHTML = plan.plan
    .map((p) => `<li><strong>Day ${p.day}:</strong> ${p.dinner} <span class="t">(${p.timeMins} min · rescues ${p.rescues.join(', ')})</span></li>`).join('');
  // Stats row
  const waste = await callTool('get_waste_report', { withinDays: 5 });
  const nut = await callTool('get_nutrition_summary', {});
  $('st-items').textContent = nut.totalItems;
  $('st-risk').textContent = waste.atRiskCount;
  $('st-value').textContent = '$' + waste.atRiskValueCAD;
  $('st-score').textContent = waste.wasteScore;
  $('st-saved').textContent = '$' + waste.rescuedThisMonth.moneySavedThisMonth;
  $('st-meals').textContent = waste.rescuedThisMonth.mealsRescuedThisMonth;
}

// --- Simulated Alexa+ reasoning: intent → real MCP tool calls ---
async function ask(raw) {
  const q = raw.toLowerCase();
  bubble('user', raw);

  if (q.includes('plan') || q.includes('week') || q.includes('5 dinners') || q.includes('five dinners')) {
    const r = await callTool('get_meal_plan', { days: 5 });
    toolCard('get_meal_plan', { days: 5 }, r);
    bubble('alexa', `Here's your rescue-first dinner plan:\n` +
      r.plan.map((p) => `Day ${p.day}: ${p.dinner} (${p.timeMins} min) — rescues ${p.rescues.join(', ')}`).join('\n') +
      (r.sharedMissingIngredients.length ? `\n\nOne small shop covers everything missing: ${r.sharedMissingIngredients.join(', ')}.` : '\n\nYou already own every ingredient. Zero shopping needed.'));
    return;
  }
  if (q.includes('waste') || q.includes('saving') || q.includes('saved') || q.includes('money') || q.includes('report')) {
    const r = await callTool('get_waste_report', { withinDays: 5 });
    toolCard('get_waste_report', { withinDays: 5 }, r);
    bubble('alexa', `Your waste report:\n• Waste score: ${r.wasteScore}/100\n• At risk right now: ${r.atRiskCount} items worth $${r.atRiskValueCAD} expiring within 5 days\n• Rescued this month: ${r.rescuedThisMonth.mealsRescuedThisMonth} meals, $${r.rescuedThisMonth.moneySavedThisMonth} saved, ${r.rescuedThisMonth.wastePreventedKgThisMonth} kg kept out of the bin\n• Cook this week's at-risk food and your projected monthly saving hits $${r.projectedMonthlySavingCAD}.\n\n${r.tip}`);
    return;
  }
  if (q.includes('protein') || q.includes('nutrition') || q.includes('healthy') || q.includes('balanced')) {
    const r = await callTool('get_nutrition_summary', {});
    toolCard('get_nutrition_summary', {}, r);
    bubble('alexa', `Kitchen nutrition snapshot — ${r.totalItems} items worth $${r.totalValueCAD}:\n\nHigh-protein options:\n` +
      r.highProteinOptions.map((i) => `• ${i.name} — ${i.proteinPerServing}g protein`).join('\n') +
      `\n\n${r.balanceNote}`);
    return;
  }
  if (q.includes('expir') || q.includes('spoil')) {
    const r = await callTool('check_expiry', { withinDays: 3 });
    toolCard('check_expiry', { withinDays: 3 }, r);
    bubble('alexa', r.summary + '\n\nWant a dinner that rescues these, or a full 5-day plan? Just ask.');
    return;
  }
  if (q.includes('cook') || q.includes('dinner') || q.includes('recipe') || q.includes('eat') || q.includes('quick') || q.includes('under')) {
    const quick = q.match(/under (\d+)/);
    const args = quick ? { maxTimeMins: Number(quick[1]) } : {};
    const exp = await callTool('check_expiry', { withinDays: 3 });
    toolCard('check_expiry', { withinDays: 3 }, exp);
    const r = await callTool('suggest_recipe', args);
    toolCard('suggest_recipe', args, r);
    const t = r.topPick;
    if (!t) { bubble('alexa', 'Nothing fits that time limit with what you have — want me to relax it?'); return; }
    bubble('alexa',
      `${r.bedrockPitch || `Tonight, rescue dinner: ${t.name}.`}\n\n🍳 ${t.name} (${t.timeMins} min, ${t.difficulty})\nRescues: ${t.rescues.join(', ')}\nYou have ${t.coverage} of the ingredients.${t.missing.length ? `\nMissing: ${t.missing.join(', ')} — say "add ${t.missing[0]} to my grocery list" and I'll queue it.` : ''}\n\nSteps:\n${t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    return;
  }
  if (q.includes('fridge') || q.includes('pantry') || q.includes('freezer') || q.includes('in my') || q.includes('have')) {
    const loc = q.includes('fridge') ? { location: 'fridge' } : q.includes('pantry') ? { location: 'pantry' } : q.includes('freezer') ? { location: 'freezer' } : {};
    const r = await callTool('get_inventory', loc);
    toolCard('get_inventory', loc, r);
    bubble('alexa', `Here's what I see${loc.location ? ` in your ${loc.location}` : ''}:\n` +
      r.items.map((i) => `• ${i.name} — ${i.qty} ${i.unit} (${i.daysLeft}d left, $${i.price ?? '—'})`).join('\n'));
    return;
  }
  if (q.startsWith('add ') || (q.includes('grocery list') && q.includes('add'))) {
    const item = raw.replace(/^(add|please add)\s+/i, '').replace(/\s+to my grocery list.*$/i, '').trim();
    const r = await callTool('add_to_grocery_list', { name: item || 'eggs', reason: 'requested in Alexa+ simulator' });
    toolCard('add_to_grocery_list', { name: item }, r);
    bubble('alexa', `Done — added ${item || 'eggs'} to your grocery list. You now have ${r.groceryList.length} item(s) queued.`);
    await refreshPanels();
    return;
  }
  if (q.includes('grocery') || q.includes('shopping list')) {
    const r = await callTool('get_grocery_list', {});
    toolCard('get_grocery_list', {}, r);
    bubble('alexa', 'Your grocery list:\n' + r.groceryList.map((i) => `• ${i.name} ×${i.qty}`).join('\n'));
    return;
  }
  bubble('alexa', 'I can check expiring food, suggest a rescue dinner, plan 5 dinners, show your waste & savings report, break down your protein options, list your fridge/pantry/freezer, or manage your grocery list — try a suggestion below.');
}

document.getElementById('composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('input');
  const v = input.value.trim(); if (!v) return;
  input.value = '';
  try { await ask(v); } catch (err) { bubble('alexa', 'Hmm, my kitchen server hiccuped: ' + err.message); }
});
document.querySelectorAll('.chip').forEach((c) =>
  c.addEventListener('click', () => ask(c.textContent.trim())));

(async () => {
  try {
    const init = await mcp('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'alexa-plus-simulator', version: '1.0.0' },
    });
    const el = document.getElementById('status');
    el.textContent = `● MCP connected — ${init.serverInfo.name} v${init.serverInfo.version} · protocol ${init.protocolVersion}`;
    el.classList.add('ok');
    await refreshPanels();
  } catch (e) {
    document.getElementById('status').textContent = 'MCP server unreachable — run: npm start';
  }
})();
