import { NextResponse } from "next/server";

import { reviewEssay } from "@/lib/review-service";
import { ReviewRequestSchema } from "@/lib/review-schema";

export const runtime = "nodejs";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "批改失败，请稍后重试。";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "请求格式不正确，请提交 JSON 数据。" },
      { status: 400 },
    );
  }

  const parsed = ReviewRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "输入内容不符合要求。" },
      { status: 400 },
    );
  }

  try {
    const review = await reviewEssay(parsed.data);
    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
