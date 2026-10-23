# AWS Builder Mini Challenge — Amazon Bedrock integration

## Service used
**Amazon Bedrock** (Converse API) via the official AWS SDK for JavaScript v3: `@aws-sdk/client-bedrock-runtime` (declared as an *optional* dependency so the core server stays zero-install).

## Where it lives
`lib/bedrock.mjs` — `enhanceWithBedrock(prompt)`

## How it is used
When the MCP tool `suggest_recipe` (`lib/tools.mjs`) produces its ranked results, PantryPilot builds a one-line prompt about the top pick (name, rescued ingredients, cook time). If Bedrock is configured, that prompt is sent to the Bedrock Converse API and the returned text is included in the tool result as `bedrockPitch`, which the Alexa+ experience speaks to the user. This puts a foundation model in the loop for natural, personal phrasing while the *ranking itself stays deterministic and testable* in the local rescue engine.

## Configuration
```bash
npm install @aws-sdk/client-bedrock-runtime   # optional dependency
BEDROCK_MODEL_ID=<your-bedrock-model-id> AWS_REGION=us-east-1 npm start
# plus standard AWS credentials in the environment / shared config
```

## Fallback behaviour (by design)
If `BEDROCK_MODEL_ID` is unset, the SDK is not installed, credentials are absent, or the call fails, `enhanceWithBedrock` returns `null` and the tool result simply omits `bedrockPitch`. The demo therefore runs identically for judges with or without AWS access, while the integration is real, documented, and one env var away from live.
