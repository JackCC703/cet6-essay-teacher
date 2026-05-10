import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { z } from "zod";

import { formatZodIssues, parseJsonWithSchema } from "@/lib/ai-json";
import {
  createAiClient,
  getAiApiKey,
  shouldUseProviderDefaultTemperature,
} from "@/lib/ai-provider";
import { OCR_SYSTEM_PROMPT, OCR_USER_PROMPT } from "@/lib/ocr-prompt";
import {
  OcrExtractResultSchema,
  type OcrExtractResult,
} from "@/lib/ocr-schema";

function getOcrModel(): string {
  return process.env.OCR_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
}

async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type || "image/jpeg";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function requestOcrJson(
  client: OpenAI,
  file: File,
  repairInstruction?: string,
): Promise<string> {
  const imageUrl = await fileToDataUrl(file);
  const prompt = repairInstruction
    ? `${OCR_USER_PROMPT}

上一次输出不符合 OcrExtractResult JSON 结构，请只修复 JSON。
修复要求：${repairInstruction}`
    : OCR_USER_PROMPT;

  const model = getOcrModel();
  const params: ChatCompletionCreateParamsNonStreaming = {
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: OCR_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
  };

  if (!shouldUseProviderDefaultTemperature(model)) {
    params.temperature = 0;
  }

  const completion = await client.chat.completions.create(params);

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("模型没有返回 OCR 结果。");
  }

  return content;
}

export async function extractEssayFromImage(
  file: File,
): Promise<OcrExtractResult> {
  if (!getAiApiKey()) {
    return {
      topic: "",
      essay: "",
      confidence: "low",
      warnings: [
        "当前未配置 OPENAI_API_KEY，无法调用视觉模型识别图片。请手动输入，或配置 OPENAI_API_KEY 与 OCR_MODEL 后重试。",
      ],
    };
  }

  const client = createAiClient();

  const firstResponse = await requestOcrJson(client, file);

  try {
    return parseJsonWithSchema(OcrExtractResultSchema, firstResponse);
  } catch (error) {
    const repairInstruction =
      error instanceof z.ZodError
        ? formatZodIssues(error)
        : "返回内容不是合法 JSON。";
    const repairedResponse = await requestOcrJson(
      client,
      file,
      repairInstruction,
    );

    return parseJsonWithSchema(OcrExtractResultSchema, repairedResponse);
  }
}
