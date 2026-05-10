import OpenAI from "openai";
import { z } from "zod";

import { formatZodIssues, parseJsonWithSchema } from "@/lib/ai-json";
import { createFallbackReview } from "@/lib/fallback-review";
import { buildReviewUserPrompt, REVIEW_SYSTEM_PROMPT } from "@/lib/review-prompt";
import {
  EssayReviewSchema,
  type EssayReview,
  type ReviewRequest,
} from "@/lib/review-schema";
import { calculateConvertedScore, getScoreLevel } from "@/lib/score";

function getReviewModel(): string {
  return process.env.AI_MODEL || "gpt-4o-mini";
}

function normalizeReview(review: EssayReview): EssayReview {
  return {
    ...review,
    score: {
      ...review.score,
      converted: calculateConvertedScore(review.score.raw),
      level: getScoreLevel(review.score.raw),
    },
  };
}

async function requestReviewJson(
  client: OpenAI,
  input: ReviewRequest,
  repairInstruction?: string,
): Promise<string> {
  const prompt = repairInstruction
    ? `${buildReviewUserPrompt(input)}

上一次输出不符合要求，请只修复 JSON，不要改变批改判断。
修复要求：${repairInstruction}`
    : buildReviewUserPrompt(input);

  const completion = await client.chat.completions.create({
    model: getReviewModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: REVIEW_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("模型没有返回批改结果。");
  }

  return content;
}

export async function reviewEssay(input: ReviewRequest): Promise<EssayReview> {
  if (!process.env.OPENAI_API_KEY) {
    return createFallbackReview(input);
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const firstResponse = await requestReviewJson(client, input);

  try {
    return normalizeReview(
      parseJsonWithSchema(EssayReviewSchema, firstResponse),
    );
  } catch (error) {
    const repairInstruction =
      error instanceof z.ZodError
        ? formatZodIssues(error)
        : "返回内容不是合法 JSON。";
    const repairedResponse = await requestReviewJson(
      client,
      input,
      repairInstruction,
    );

    return normalizeReview(
      parseJsonWithSchema(EssayReviewSchema, repairedResponse),
    );
  }
}
