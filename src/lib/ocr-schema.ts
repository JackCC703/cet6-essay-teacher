import { z } from "zod";

export const OcrExtractResultSchema = z.object({
  topic: z.string(),
  essay: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  warnings: z.array(z.string()),
});

export type OcrExtractResult = z.infer<typeof OcrExtractResultSchema>;
