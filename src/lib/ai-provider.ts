import OpenAI from "openai";

export function getAiApiKey(): string {
  return (
    process.env.AI_API_KEY ||
    process.env.MOONSHOT_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}

export function getAiBaseUrl(): string | undefined {
  return (
    process.env.AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    process.env.MOONSHOT_BASE_URL ||
    undefined
  );
}

export function createAiClient(): OpenAI {
  const baseURL = getAiBaseUrl();

  return new OpenAI({
    apiKey: getAiApiKey(),
    baseURL,
  });
}

export function shouldUseProviderDefaultTemperature(model: string): boolean {
  const normalized = model.toLowerCase();

  return (
    normalized.startsWith("kimi-k2.5") ||
    normalized.startsWith("kimi-k2.6")
  );
}
