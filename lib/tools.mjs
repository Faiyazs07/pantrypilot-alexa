import {
  getInventory, checkExpiry, suggestRecipe,
  addToGroceryList, getGroceryList, addInventoryItem,
  getWasteReport, getMealPlan, getNutritionSummary,
} from './store.mjs';
import { enhanceWithBedrock } from './bedrock.mjs';

export const TOOLS = [
  {
    name: 'get_inventory',
    description: "List what's currently in the user's kitchen, sorted by soonest expiry. Optionally filter by location (fridge/pantry/freezer) or category.",
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', enum: ['fridge', 'pantry', 'freezer'] },
        category: { type: 'string' },
      },
    },
  },
  {
    name: 'check_expiry',
    description: 'Find food expiring within N days (default 3) so it can be rescued instead of wasted.',
    inputSchema: {
      type: 'object',
      properties: { withinDays: { type: 'number', default: 3 } },
    },
  },
  {
    name: 'suggest_recipe',
    description: 'Suggest recipes ranked by ingredient coverage and how much soon-to-expire food they rescue. Optionally cap by cooking time.',
    inputSchema: {
      type: 'object',
      properties: { maxTimeMins: { type: 'number' } },
    },
  },
  {
    name: 'add_to_grocery_list',
    description: 'Add an item to the shared grocery list.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        qty: { type: 'number', default: 1 },
        unit: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_grocery_list',
    description: 'Read the current grocery list.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'add_inventory_item',
    description: 'Log a newly bought item into the pantry/fridge inventory.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        qty: { type: 'number', default: 1 },
        unit: { type: 'string' },
        location: { type: 'string', enum: ['fridge', 'pantry', 'freezer'], default: 'fridge' },
        category: { type: 'string', default: 'other' },
        expires: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_waste_report',
    description: 'Money-and-waste report: value of food at risk of expiring, this month\'s rescued meals/savings, a 0-100 waste score, and a coaching tip.',
    inputSchema: {
      type: 'object',
      properties: { withinDays: { type: 'number', default: 5 } },
    },
  },
  {
    name: 'get_meal_plan',
    description: 'Build a multi-day dinner plan ordered so the most urgent expiry rescues happen first, with a combined missing-ingredients list.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', default: 5 } },
    },
  },
  {
    name: 'get_nutrition_summary',
    description: 'Kitchen nutrition overview: total items and value, high-protein options, counts by location and category, and a balance note.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const text = (obj) => ({
  content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }],
});

export async function callTool(name, args = {}) {
  switch (name) {
    case 'get_inventory':
      return text({ household: "Faiyaz's Kitchen", items: getInventory(args) });
    case 'check_expiry': {
      const items = checkExpiry(args);
      return text({
        summary: items.length
          ? `${items.length} item(s) need rescuing soon: ${items.map((i) => `${i.name} (${i.daysLeft}d left)`).join(', ')}`
          : 'Nothing is expiring soon. Nice.',
        items,
      });
    }
    case 'suggest_recipe': {
      const ranked = suggestRecipe(args);
      const top = ranked[0];
      let note = null;
      if (top) {
        note = await enhanceWithBedrock(
          `In one friendly sentence, pitch this dinner: ${top.name}. It rescues ${top.rescues.join(', ')} and takes ${top.timeMins} minutes.`
        );
      }
      return text({ topPick: top, alternatives: ranked.slice(1, 3), bedrockPitch: note });
    }
    case 'add_to_grocery_list':
      return text({ added: args.name, groceryList: addToGroceryList(args) });
    case 'get_grocery_list':
      return text({ groceryList: getGroceryList() });
    case 'add_inventory_item':
      return text({ added: args.name, inventory: addInventoryItem(args) });
    case 'get_waste_report':
      return text(getWasteReport(args));
    case 'get_meal_plan':
      return text(getMealPlan(args));
    case 'get_nutrition_summary':
      return text(getNutritionSummary());
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
