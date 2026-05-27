import { NextResponse } from "next/server";

import { extractEssayFromImage } from "@/lib/ocr-service";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

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

function getRequestId(formData: FormData): string {
  const rawRequestId = formData.get("requestId");

  if (typeof rawRequestId === "string" && rawRequestId.trim()) {
    return rawRequestId.trim().slice(0, 80);
  }

  return `server-${Date.now().toString(36)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "图片识别失败，请重新拍照或手动输入。";
}

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  const formDataStartedAt = performance.now();
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    console.warn(
      `[ocr] formData parse failed elapsed=${formatDuration(
        performance.now() - formDataStartedAt,
      )}`,
    );

    return NextResponse.json(
      { error: "图片上传格式不正确，请重新选择文件。" },
      { status: 400 },
    );
  }

  const requestId = getRequestId(formData);
  const file = formData.get("file");

  if (!(file instanceof File)) {
    console.warn(
      `[ocr:${requestId}] missing file formDataElapsed=${formatDuration(
        performance.now() - formDataStartedAt,
      )}`,
    );

    return NextResponse.json(
      { error: "请上传一张作文图片。" },
      { status: 400 },
    );
  }

  if (!ACCEPTED_TYPES.has(file.type)) {
    console.warn(
      `[ocr:${requestId}] rejected file type=${file.type || "unknown"} size=${formatBytes(
        file.size,
      )}`,
    );

    return NextResponse.json(
      { error: "图片格式仅支持 jpg、jpeg、png、webp。" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    console.warn(
      `[ocr:${requestId}] rejected oversized file type=${
        file.type || "unknown"
      } size=${formatBytes(file.size)}`,
    );

    return NextResponse.json(
      { error: "单张图片不能超过 10MB。" },
      { status: 400 },
    );
  }

  console.info(
    `[ocr:${requestId}] request accepted type=${
      file.type || "unknown"
    } size=${formatBytes(file.size)} formDataElapsed=${formatDuration(
      performance.now() - formDataStartedAt,
    )}`,
  );

  try {
    const result = await extractEssayFromImage(file, { requestId });

    console.info(
      `[ocr:${requestId}] route completed total=${formatDuration(
        performance.now() - requestStartedAt,
      )} topicChars=${result.topic.length} essayChars=${
        result.essay.length
      } warnings=${result.warnings.length}`,
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error(
      `[ocr:${requestId}] route failed total=${formatDuration(
        performance.now() - requestStartedAt,
      )}`,
      error,
    );

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
