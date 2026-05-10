import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { z } from "zod";

import { formatZodIssues, parseJsonPayload } from "@/lib/ai-json";
import {
  createAiClient,
  getAiApiKey,
  shouldUseProviderDefaultTemperature,
} from "@/lib/ai-provider";
import { createFallbackReview } from "@/lib/fallback-review";
import { normalizeEssayReviewPayload } from "@/lib/review-normalizer";
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
  previousResponse?: string,
): Promise<string> {
  const prompt = repairInstruction
    ? `${buildReviewUserPrompt(input)}

上一次输出不符合 EssayReview JSON 结构。请根据下面的原始输出，只修复字段名、枚举值和缺失字段，不要改变批改判断。
修复要求：${repairInstruction}

上一次原始输出：
${previousResponse ?? "无"}`
    : buildReviewUserPrompt(input);

  const model = getReviewModel();
  const params: ChatCompletionCreateParamsNonStreaming = {
    model,
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
  };

  if (!shouldUseProviderDefaultTemperature(model)) {
    params.temperature = 0.2;
  }

  const completion = await client.chat.completions.create(params);

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("模型没有返回批改结果。");
  }

  return content;
}

export async function reviewEssay(input: ReviewRequest): Promise<EssayReview> {
  if (!getAiApiKey()) {
    return createFallbackReview(input);
  }

  const client = createAiClient();

  const firstResponse = await requestReviewJson(client, input);

  try {
    const normalized = normalizeEssayReviewPayload(
      parseJsonPayload(firstResponse),
      input,
    );

    return normalizeReview(EssayReviewSchema.parse(normalized));
  } catch (error) {
    const repairInstruction =
      error instanceof z.ZodError
        ? formatZodIssues(error)
        : "返回内容不是合法 JSON。";
    const repairedResponse = await requestReviewJson(
      client,
      input,
      repairInstruction,
      firstResponse,
    );

    const normalized = normalizeEssayReviewPayload(
      parseJsonPayload(repairedResponse),
      input,
    );

    return normalizeReview(EssayReviewSchema.parse(normalized));
  }
}
