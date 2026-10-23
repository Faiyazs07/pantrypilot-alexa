/**
 * Optional Amazon Bedrock enhancer.
 *
 * If BEDROCK_MODEL_ID + AWS credentials are present, PantryPilot asks
 * Amazon Bedrock (Converse API, via the official AWS SDK) to rewrite the
 * top local recipe match in a friendlier, more personal tone.
 * Without AWS configured, the local rescue-ranking engine is used alone,
 * so the demo always runs. This adapter is dynamically imported so the
 * core server has zero required dependencies.
 */
export async function enhanceWithBedrock(prompt) {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) return null;
  try {
    const { BedrockRuntimeClient, ConverseCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    const out = await client.send(
      new ConverseCommand({
        modelId,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 300, temperature: 0.7 },
      })
    );
    return out.output?.message?.content?.map((c) => c.text).join(' ') || null;
  } catch {
    return null; // graceful fallback — local engine already produced an answer
  }
}

export const bedrockStatus = () =>
  process.env.BEDROCK_MODEL_ID
    ? `Bedrock configured (${process.env.BEDROCK_MODEL_ID})`
    : 'Bedrock not configured — local rescue engine active (set BEDROCK_MODEL_ID + AWS creds to enable)';
