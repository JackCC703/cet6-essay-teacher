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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "图片识别失败，请重新拍照或手动输入。";
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "图片上传格式不正确，请重新选择文件。" },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "请上传一张作文图片。" },
      { status: 400 },
    );
  }

  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "图片格式仅支持 jpg、jpeg、png、webp。" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "单张图片不能超过 10MB。" },
      { status: 400 },
    );
  }

  try {
    const result = await extractEssayFromImage(file);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
