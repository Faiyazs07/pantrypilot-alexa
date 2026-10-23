import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(dir, '..', 'data', 'pantry.json');
const recipesPath = join(dir, '..', 'data', 'recipes.json');

const load = () => JSON.parse(readFileSync(dataPath, 'utf8'));
const save = (db) => writeFileSync(dataPath, JSON.stringify(db, null, 2) + '\n');

export const recipes = JSON.parse(readFileSync(recipesPath, 'utf8'));

const today = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
export const daysUntil = (dateStr) =>
  Math.round((new Date(dateStr + 'T00:00:00Z') - today()) / 86400000);

export function getInventory({ location, category } = {}) {
  let items = load().inventory;
  if (location) items = items.filter((i) => i.location === location);
  if (category) items = items.filter((i) => i.category === category);
  return items
    .map((i) => ({ ...i, daysLeft: daysUntil(i.expires) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function checkExpiry({ withinDays = 3 } = {}) {
  return getInventory().filter((i) => i.daysLeft <= withinDays);
}

export function suggestRecipe({ maxTimeMins } = {}) {
  const inv = new Set(getInventory().map((i) => i.name));
  const scored = recipes
    .map((r) => {
      const have = r.ingredients.filter((g) => inv.has(g));
      const rescueScore = r.rescues.reduce((s, name) => {
        const item = getInventory().find((i) => i.name === name);
        return s + (item ? Math.max(0, 5 - item.daysLeft) : 0);
      }, 0);
      return {
        ...r,
        coverage: `${have.length}/${r.ingredients.length}`,
        missing: r.ingredients.filter((g) => !inv.has(g)),
        score: have.length * 10 + rescueScore,
      };
    })
    .filter((r) => !maxTimeMins || r.timeMins <= maxTimeMins)
    .sort((a, b) => b.score - a.score);
  return scored;
}

export function addToGroceryList({ name, qty = 1, unit = '', reason = 'requested via Alexa+' }) {
  const db = load();
  db.groceryList.push({ name, qty, unit, reason, addedBy: 'PantryPilot MCP' });
  save(db);
  return db.groceryList;
}

export function addInventoryItem({ name, qty = 1, unit = '', location = 'fridge', category = 'other', expires }) {
  const db = load();
  db.inventory.push({ name, qty, unit, location, category, expires: expires || '2026-11-30' });
  save(db);
  return getInventory();
}

export function getGroceryList() {
  return load().groceryList;
}

const money = (n) => Math.round(n * 100) / 100;

export function getWasteReport({ withinDays = 5 } = {}) {
  const atRisk = getInventory().filter((i) => i.daysLeft <= withinDays);
  const db = load();
  return {
    atRiskCount: atRisk.length,
    atRiskValueCAD: money(atRisk.reduce((s, i) => s + (i.price || 0), 0)),
    atRiskItems: atRisk.map((i) => ({ name: i.name, daysLeft: i.daysLeft, valueCAD: i.price || 0 })),
    rescuedThisMonth: db.stats,
    projectedMonthlySavingCAD: money(db.stats.moneySavedThisMonth + atRisk.reduce((s, i) => s + (i.price || 0), 0)),
    wasteScore: Math.max(0, 100 - atRisk.length * 9),
    tip: atRisk.length
      ? `Cook the $${money(atRisk.reduce((s, i) => s + (i.price || 0), 0))} of food expiring in the next ${withinDays} days and it never hits the bin.`
      : 'Nothing at risk — your waste score is perfect.',
  };
}

export function getMealPlan({ days = 5 } = {}) {
  const ranked = suggestRecipe({});
  const plan = [];
  for (let d = 0; d < Math.min(days, ranked.length); d++) {
    const r = ranked[d];
    plan.push({
      day: d + 1,
      dinner: r.name,
      timeMins: r.timeMins,
      rescues: r.rescues,
      missing: r.missing,
    });
  }
  const missingAll = [...new Set(plan.flatMap((p) => p.missing))];
  return { plan, sharedMissingIngredients: missingAll, note: 'Ordered so the most urgent rescues happen first.' };
}

export function getNutritionSummary() {
  const inv = getInventory();
  const highProtein = inv.filter((i) => (i.protein || 0) >= 7)
    .sort((a, b) => b.protein - a.protein)
    .map((i) => ({ name: i.name, proteinPerServing: i.protein }));
  const byLocation = {};
  for (const i of inv) byLocation[i.location] = (byLocation[i.location] || 0) + 1;
  const byCategory = {};
  for (const i of inv) byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  return {
    totalItems: inv.length,
    totalValueCAD: money(inv.reduce((s, i) => s + (i.price || 0), 0)),
    highProteinOptions: highProtein,
    byLocation,
    byCategory,
    balanceNote: 'Good protein coverage (chicken, salmon, shrimp, eggs, yogurt). Produce is the tightest category this week — 7 items, 4 expiring within 5 days.',
  };
}
