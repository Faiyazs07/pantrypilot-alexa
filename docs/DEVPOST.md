# PantryPilot — Devpost Submission Copy (paste-ready)

## General info
- **Project name:** PantryPilot
- **Elevator pitch:** Alexa+ that runs your kitchen — expiry-rescue dinners, 5-day meal plans, waste & savings reports, and nutrition coaching, all over MCP. *(136 chars)*

## Project Story (About the project)

## Inspiration
Every week I would open my fridge, find spinach or yogurt that expired two days ago, and throw it out — then ask a voice assistant what to make for dinner and get a generic recipe that ignored everything I actually owned. The assistant wasn't dumb; it was blind. It had no way to know my kitchen. When Amazon opened Alexa+ to MCP servers, that blindness became fixable: I could give Alexa+ real tools over my own data. PantryPilot is that fix — an assistant that doesn't just answer, it *knows what's in your fridge*.

## What it does
PantryPilot is a self-hosted MCP server (spec 2025-11-25, Streamable HTTP) exposing nine kitchen tools to Alexa+: `get_inventory`, `check_expiry`, `suggest_recipe`, `add_to_grocery_list`, `get_grocery_list`, `add_inventory_item`, `get_waste_report`, `get_meal_plan`, and `get_nutrition_summary`. Ask "what's expiring soon?" and Alexa+ calls `check_expiry` on live household data. Ask "what should I cook tonight?" and it chains `check_expiry` → `suggest_recipe`, which ranks recipes by ingredient coverage plus a rescue score that grows as food nears expiry — so tonight's dinner is the one that saves the spinach, yogurt and chicken from the bin. Missing an ingredient? It lands on the grocery list with one more tool call. Ask for a plan and `get_meal_plan` sequences five dinners so the most urgent rescues happen first. Ask about money and `get_waste_report` prices the food at risk, scores your waste out of 100, and tracks the meals and dollars already rescued this month. Ask about health and `get_nutrition_summary` breaks down protein options and category balance. The simulator is a white-and-blue live dashboard — items tracked, at-risk value, waste score, monthly savings — all fed by the same MCP calls.

The included web app is a simulated Alexa+ experience: it performs a real MCP `initialize` handshake on load, and every answer is composed from actual JSON-RPC tool calls, with the MCP traffic shown in-chat. Nothing in the demo is hard-coded.

## How I built it
- A zero-required-dependency Node.js server implementing MCP over Streamable HTTP: `initialize` negotiation, `ping`, `tools/list`, `tools/call`, notifications, and spec-correct 405 handling for GET on a stateless server.
- Server `instructions` in the initialize result steer the agent to check expiry before suggesting recipes — behaviour shaped at the protocol level, not the prompt level.
- A rescue-ranking engine (`lib/store.mjs`) over a JSON household store, and a recipe library where each recipe declares which at-risk ingredients it rescues.
- An optional Amazon Bedrock adapter (`lib/bedrock.mjs`): with `BEDROCK_MODEL_ID` + AWS credentials set, Amazon Bedrock (Converse API, official AWS SDK) pitches the top recipe pick; without them, the local engine answers alone, so the demo runs anywhere.
- The simulator frontend is a genuine MCP client (fetch + JSON-RPC), which doubles as living documentation of the protocol.

## Challenges I faced
- Implementing Streamable HTTP correctly without an SDK crutch: session headers, notification handling (202, no body), and error codes all had to match the 2025-11-25 spec by hand.
- Making recipe ranking feel *smart* rather than random: the breakthrough was scoring rescues by days-left, so urgency — not just ingredient overlap — drives the recommendation.
- Keeping the demo honest: it was tempting to fake the chat answers. Instead the UI calls the real tools, which made the demo slower to build but actually proves the Alexa+ integration works.
- Time: this was designed, built, tested and documented inside a single day.

## What I learned
How MCP really works under the hood (not just through an SDK), how much agent behaviour you can shape with server instructions and tool descriptions alone, and a design principle I'll reuse everywhere: **give the model tools over real data, and a narrow, well-described tool beats a clever prompt every time.**

## What's next
Barcode/receipt scanning to auto-log groceries, multi-household sharing, price-aware grocery lists, and deploying the server behind AgentCore Runtime for a production Alexa+ integration.

## Built with
nodejs, model-context-protocol, mcp, json-rpc, amazon-bedrock, aws-sdk, javascript, html5, css3, rest-api

## "Try it out" links
- GitHub repo: *(paste repo URL after pushing)*
- Live demo: *(paste deployed URL if deployed, otherwise the GitHub repo — judges can run `npm start` in under a minute, zero dependencies)*

## Additional info (judges)
- **Submitter Type:** Individual
- **Organization Name:** N/A
- **Submitter Country of Residence:** Canada
- **Province (Canada):** Saskatchewan
- **Primary Track:** Alexa+  *(note: the form groups it as "Alexa+Bee" in some views — select Alexa+)*
- **Project new or existing?** New — created during the submission period (after August 31, 2026)
- **AWS Builder Mini Challenge?** Yes
  - **Which AWS services and how:** Amazon Bedrock — `lib/bedrock.mjs` uses the Bedrock Converse API (via `@aws-sdk/client-bedrock-runtime`, optional dependency) to generate the natural-language pitch for the top expiry-rescue recipe returned by the MCP `suggest_recipe` tool. It is env-gated (`BEDROCK_MODEL_ID`, `AWS_REGION`) with a graceful local fallback so the server runs with or without AWS credentials. Integration documented in README + `docs/AWS_BEDROCK.md`.
- **Open Source Mini Challenge?** Yes
  - **Contribution URL:** *(same as repo URL)*
  - **Project Repository URL:** *(repo URL)*
  - **GitHub Username:** *(Faiyaz's GitHub username — fill at submit)*
  - **Description:** PantryPilot is a brand-new open-source (MIT) MCP server created during the hackathon window. It gives any MCP-compatible agent live kitchen awareness — inventory, expiry rescue, recipe ranking, grocery lists — in a zero-dependency Node server others can fork for any household-data domain (meds, supplies, pets). It matters because household food waste is an information problem, and this is a reusable, inspectable reference implementation of a useful consumer MCP server.
- **AI tools leveraged:** Muse (Meta AI assistant) used as a pair-programming/build assistant; Amazon Bedrock optionally at runtime as described above.
- **Level of learning:** *(select the highest/strongest option available, e.g. "Learned a new technology / built with a new platform")*
- **Did you gain AI value usable in your career?** Yes — hands-on MCP server development for Alexa+, protocol-level agent design, and Bedrock integration patterns directly applicable to production agent work.

## Feedback Questions

**Q1 — Which developer tools, APIs, SDKs did you use and for what?**
Alexa+ / MCP (spec 2025-11-25, Streamable HTTP) as the integration surface for Alexa+; a hand-rolled JSON-RPC 2.0 server in Node.js; Amazon Bedrock Converse API via @aws-sdk/client-bedrock-runtime (optional) for recipe pitches; Devpost for submission; standard web stack (fetch, HTML/CSS/JS) for the simulated Alexa+ experience.

**Q2 — What worked well?**
The MCP spec itself is clean — once the initialize handshake and tools/list shape clicked, tool calls just worked. Tool descriptions carried a surprising amount of agent behaviour. Bedrock's Converse API is a genuinely pleasant single-endpoint design. Node's built-in HTTP server was more than enough; zero dependencies meant zero install friction for judges.

**Q3 — What needs work?**
Discovering the current Alexa+ MCP expectations took digging through multiple pages — a single "your first Alexa+ MCP server" quickstart with a reference implementation would cut onboarding from hours to minutes. Streamable HTTP edge cases (notification responses, GET handling on stateless servers, session header expectations) are easy to get subtly wrong without a validator tool. A hosted MCP inspector/test harness from Amazon would help a lot.

**Q4 — Onboarding experience?**
Going from zero to hello-world was the hardest part: the concepts (MCP, Agent Skills, simulated experiences) are powerful but spread across docs. Once I picked the self-hosted MCP server path and found the spec version requirement (2025-11-25+), momentum was fast and the build was genuinely fun.

**Q5 — Would you build with these devices/services again?**
Yes — absolutely. MCP makes Alexa+ feel like a real platform instead of a closed assistant: my data, my server, my tools, and the agent does the reasoning. PantryPilot is the first of several household servers I want to build this way.

## Friction Log (bonus — up to 10%)
- **Task:** Find the required MCP spec version and transport for an Alexa+ submission. **Steps:** Searched hackathon page → rules → Alexa+ track docs. **Expected:** One page stating "spec ≥ 2025-11-25, Streamable HTTP, these methods required." **Actual:** Requirements were spread across the track description and external MCP docs. **Severity:** Medium. **Workaround:** Implemented the full initialize/tools surface directly from the MCP spec. **Suggestion:** Publish a one-page Alexa+ MCP checklist + minimal reference server.
- **Task:** Validate a hand-rolled MCP server. **Steps:** Built smoke tests by hand (initialize → tools/list → tools/call via curl/fetch). **Expected:** An official validator/inspector URL. **Actual:** None found in the hackathon materials. **Severity:** Low–Medium. **Workaround:** Wrote `test/smoke.mjs` (included in the repo). **Suggestion:** Ship an Amazon-hosted MCP inspector for hackathon participants.

## Feature Request (optional)
**Request:** A hosted "Alexa+ MCP Playground" — paste a server URL, see the handshake, tool list, and a simulated conversation with live tool-call traces. **Why it matters:** It would let developers debug agent behaviour (not just transport) before submission, and it would have cut my debugging time in half. **Priority:** Important.
