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

type OcrServiceOptions = {
  requestId?: string;
};

function getOcrModel(): string {
  return process.env.OCR_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
}

function getLogPrefix(requestId: string | undefined): string {
  return requestId ? `[ocr:${requestId}]` : "[ocr]";
}

function formatDuration(milliseconds: number): string {
  return `${Math.round(milliseconds)}ms`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type || "image/jpeg";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function requestOcrJson(
  client: OpenAI,
  imageUrl: string,
  requestId: string | undefined,
  repairInstruction?: string,
): Promise<string> {
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

  const startedAt = performance.now();
  console.info(
    `${getLogPrefix(requestId)} model request started model=${model} repair=${Boolean(
      repairInstruction,
    )}`,
  );

  const completion = await client.chat.completions.create(params);
  const elapsedMs = performance.now() - startedAt;

  const content = completion.choices[0]?.message?.content;

  console.info(
    `${getLogPrefix(requestId)} model request completed elapsed=${formatDuration(
      elapsedMs,
    )} responseChars=${content?.length ?? 0}`,
  );

  if (!content) {
    throw new Error("模型没有返回 OCR 结果。");
  }

  return content;
}

export async function extractEssayFromImage(
  file: File,
  options: OcrServiceOptions = {},
): Promise<OcrExtractResult> {
  const requestId = options.requestId;
  const totalStartedAt = performance.now();

  if (!getAiApiKey()) {
    console.warn(`${getLogPrefix(requestId)} missing AI API key, skip OCR`);

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

  const dataUrlStartedAt = performance.now();
  const imageUrl = await fileToDataUrl(file);

  console.info(
    `${getLogPrefix(requestId)} data URL ready fileSize=${formatBytes(
      file.size,
    )} dataUrlChars=${imageUrl.length} elapsed=${formatDuration(
      performance.now() - dataUrlStartedAt,
    )}`,
  );

  const firstResponse = await requestOcrJson(client, imageUrl, requestId);
  const parseStartedAt = performance.now();

  try {
    const result = parseJsonWithSchema(OcrExtractResultSchema, firstResponse);

    console.info(
      `${getLogPrefix(requestId)} first response parsed elapsed=${formatDuration(
        performance.now() - parseStartedAt,
      )} total=${formatDuration(performance.now() - totalStartedAt)}`,
    );

    return result;
  } catch (error) {
    const repairInstruction =
      error instanceof z.ZodError
        ? formatZodIssues(error)
        : "返回内容不是合法 JSON。";
    const repairStartedAt = performance.now();

    console.warn(
      `${getLogPrefix(requestId)} first response parse failed elapsed=${formatDuration(
        performance.now() - parseStartedAt,
      )}; requesting repair`,
    );
    const repairedResponse = await requestOcrJson(
      client,
      imageUrl,
      requestId,
      repairInstruction,
    );
    const result = parseJsonWithSchema(OcrExtractResultSchema, repairedResponse);

    console.info(
      `${getLogPrefix(requestId)} repaired response parsed elapsed=${formatDuration(
        performance.now() - repairStartedAt,
      )} total=${formatDuration(performance.now() - totalStartedAt)}`,
    );

    return result;
  }
}
