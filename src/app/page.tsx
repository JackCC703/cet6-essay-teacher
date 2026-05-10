"use client";

import { useState } from "react";

import { EssayInputPanel } from "@/components/essay-input-panel";
import { ReviewReport } from "@/components/review-report";
import { DEMO_EXAMPLE } from "@/lib/examples";
import type { EssayReview } from "@/lib/review-schema";

type ReviewSuccessResponse = {
  review: EssayReview;
};

type ReviewErrorResponse = {
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReviewSuccessResponse(
  value: unknown,
): value is ReviewSuccessResponse {
  return isRecord(value) && isRecord(value.review);
}

function isReviewErrorResponse(value: unknown): value is ReviewErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [review, setReview] = useState<EssayReview | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          essay,
        }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          isReviewErrorResponse(data) ? data.error : "批改失败，请稍后重试。",
        );
      }

      if (!isReviewSuccessResponse(data)) {
        throw new Error("批改返回格式异常，请稍后重试。");
      }

      setReview(data.review);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "批改失败，请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleUseExample() {
    setTopic(DEMO_EXAMPLE.topic);
    setEssay(DEMO_EXAMPLE.essay);
    setReview(DEMO_EXAMPLE.review);
    setError("");
    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <EssayInputPanel
            error={error}
            essay={essay}
            isSubmitting={isSubmitting}
            onEssayChange={setEssay}
            onSubmit={handleSubmit}
            onTopicChange={setTopic}
            onUseExample={handleUseExample}
            topic={topic}
          />
        </div>
        <ReviewReport review={review} />
      </div>
    </main>
  );
}
