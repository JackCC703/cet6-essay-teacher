import { z } from "zod";

export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (withoutFence.startsWith("{") && withoutFence.endsWith("}")) {
    return withoutFence;
  }

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return withoutFence.slice(start, end + 1);
  }

  return withoutFence;
}

export function parseJsonWithSchema<T>(
  schema: z.ZodType<T>,
  text: string,
): T {
  const payload = extractJsonPayload(text);
  const parsed: unknown = JSON.parse(payload);
  return schema.parse(parsed);
}

export function parseJsonPayload(text: string): unknown {
  return JSON.parse(extractJsonPayload(text));
}

export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}
