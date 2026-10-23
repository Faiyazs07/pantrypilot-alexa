# Demo Video Script — PantryPilot (target 2:00–2:30, must stay under 3:00)

Record screen at 1080p. Have `npm start` already running, browser open at http://localhost:8787

**[0:00–0:20] Hook**
"This spinach expires tomorrow. A normal voice assistant has no idea it exists. Alexa+ with PantryPilot does — because I gave it a real MCP server over my actual kitchen. I'm Faiyaz, and this is PantryPilot."

**[0:20–0:45] Expiry**
Click chip: *"What's expiring soon?"*
Point at the tool-call card: "That's a live MCP call — `check_expiry` — to my self-hosted server, spec 2025-11-25, Streamable HTTP. Spinach: 1 day left. Yogurt and chicken: 2."

**[0:45–1:25] Rescue dinner (hero moment)**
Click: *"What should I cook tonight?"*
"Watch it chain two tools: check expiry first, then suggest a recipe ranked by what it *rescues*. Top pick: Spinach & Yogurt Chicken Skillet — 25 minutes, rescues all three at-risk items. That's food waste prevented by an agent that knows the kitchen."

**[1:25–1:50] Grocery loop**
Type: *"Add lemons to my grocery list"* — or use a missing ingredient.
"It writes back through MCP, and the grocery panel on the right updates live — same server, same data."

**[1:50–2:15] Under the hood (10 seconds terminal)**
Show terminal / curl one raw JSON-RPC call, or show repo tree.
"Zero dependencies, Node only. Optional Amazon Bedrock pitches the recipe when AWS is configured, local engine otherwise. Full code is open source, MIT."

**[2:15–2:30] Close**
"PantryPilot: Alexa+ that actually knows your kitchen. Repo and instructions are on Devpost — `npm start` and it runs. Thanks for watching."

### Recording tips
- Record at least one full clean take; narrate live if possible (judges trust live voice over TTS).
- Keep mouse movements slow; zoom browser to 110–125% so text is readable.
- Upload to YouTube as **unlisted**, paste the link in Devpost "Video demo link".
