"use client";

import { FilePlus2, Loader2, Play, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { ImageUploadPanel } from "@/components/image-upload-panel";
import { DEMO_EXAMPLE } from "@/lib/examples";
import type { OcrExtractResult } from "@/lib/ocr-schema";
import {
  CET6_MIN_WORDS,
  CET6_TARGET_MAX_WORDS,
  countEnglishWords,
  MAX_REVIEW_WORDS,
  SEVERE_SHORT_ESSAY_WORDS,
} from "@/lib/score";

type EssayInputPanelProps = {
  topic: string;
  essay: string;
  error: string;
  isSubmitting: boolean;
  onTopicChange: (value: string) => void;
  onEssayChange: (value: string) => void;
  onSubmit: () => void;
  onUseExample: () => void;
};

export function EssayInputPanel({
  topic,
  essay,
  error,
  isSubmitting,
  onTopicChange,
  onEssayChange,
  onSubmit,
  onUseExample,
}: EssayInputPanelProps) {
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const wordCount = countEnglishWords(essay);
  const isUnderHardLimit = wordCount > 0 && wordCount < SEVERE_SHORT_ESSAY_WORDS;
  const isUnderSuggestedLimit =
    wordCount >= SEVERE_SHORT_ESSAY_WORDS && wordCount < CET6_MIN_WORDS;
  const isOverSuggestedRange = wordCount > CET6_TARGET_MAX_WORDS;
  const isOverLimit = wordCount > MAX_REVIEW_WORDS;

  function handleExtracted(result: OcrExtractResult) {
    if (result.topic.trim()) {
      onTopicChange(result.topic);
    }

    if (result.essay.trim()) {
      onEssayChange(result.essay);
    }

    setOcrWarnings(result.warnings);
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-normal text-ink">
          AI 六级作文老师
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          先判断扣题，再给分，并给出六级可迁移修改。
        </p>
      </div>

      <ImageUploadPanel onExtracted={handleExtracted} />

      {ocrWarnings.length > 0 ? (
        <div className="mt-3 rounded-md border border-warning/25 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <TriangleAlert className="h-4 w-4" />
            OCR 提醒
          </div>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-ink">
            {ocrWarnings.map((warning, index) => (
              <li className="flex gap-2" key={`${warning}-${index}`}>
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="block">
          <span className="text-sm font-semibold text-ink">作文题目</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-focus focus:ring-2 focus:ring-blue-100"
            onChange={(event) => onTopicChange(event.target.value)}
            placeholder="粘贴六级作文 Directions 或题目要求"
            value={topic}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">学生作文</span>
          <textarea
            className="mt-2 min-h-72 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-focus focus:ring-2 focus:ring-blue-100"
            onChange={(event) => onEssayChange(event.target.value)}
            placeholder="输入或粘贴英文作文正文，OCR 回填后也可以手动修改"
            value={essay}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">
            <span
              className={
                isOverLimit || isUnderHardLimit
                  ? "font-semibold text-danger"
                  : "font-semibold text-ink"
              }
            >
              {wordCount}
            </span>{" "}
            words
            {isUnderHardLimit ? (
              <span className="ml-2 text-danger">少于 80 词会明显限分</span>
            ) : null}
            {isUnderSuggestedLimit ? (
              <span className="ml-2 text-warning">少于 150 词会限分</span>
            ) : null}
            {isOverSuggestedRange && !isOverLimit ? (
              <span className="ml-2 text-warning">建议控制在 150-200 词</span>
            ) : null}
            {isOverLimit ? (
              <span className="ml-2 text-danger">超过 500 词</span>
            ) : null}
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-focus px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isSubmitting ? "批改中" : "开始批改"}
          </button>
        </div>

        {error ? (
          <div className="flex gap-2 rounded-md border border-danger/20 bg-red-50 p-3 text-sm leading-6 text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
          <FilePlus2 className="h-4 w-4" />
          示例作文
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-focus hover:text-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => {
              setOcrWarnings([]);
              onUseExample();
            }}
            type="button"
          >
            {DEMO_EXAMPLE.label}
          </button>
        </div>
      </div>
    </section>
  );
}
