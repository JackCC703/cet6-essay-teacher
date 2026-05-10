"use client";

import { Camera, ImageUp, Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";

import type { OcrExtractResult } from "@/lib/ocr-schema";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

type ImageUploadPanelProps = {
  onExtracted: (result: OcrExtractResult) => void;
};

type OcrSuccessResponse = {
  result: OcrExtractResult;
};

type OcrErrorResponse = {
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOcrSuccessResponse(value: unknown): value is OcrSuccessResponse {
  return isRecord(value) && isRecord(value.result);
}

function isOcrErrorResponse(value: unknown): value is OcrErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

export function ImageUploadPanel({ onExtracted }: ImageUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  async function handleFile(file: File) {
    setError("");
    setFileName(file.name);

    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("图片格式仅支持 jpg、jpeg、png、webp。");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("单张图片不能超过 10MB。");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          isOcrErrorResponse(data) ? data.error : "图片识别失败，请手动输入。",
        );
      }

      if (!isOcrSuccessResponse(data)) {
        throw new Error("OCR 返回格式异常，请手动输入。");
      }

      onExtracted(data.result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "图片识别失败，请手动输入。",
      );
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">图片上传 / 拍照识别</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            支持单张 jpg、jpeg、png、webp，最多 10MB。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink transition hover:border-focus hover:text-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageUp className="h-4 w-4" />
            )}
            选择图片
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink transition hover:border-focus hover:text-focus disabled:cursor-not-allowed disabled:opacity-60 sm:hidden"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Camera className="h-4 w-4" />
            拍照
          </button>
        </div>
      </div>
      <input
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleFile(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      {fileName ? (
        <p className="mt-3 truncate text-xs text-muted">当前图片：{fileName}</p>
      ) : null}
      {error ? (
        <div className="mt-3 flex gap-2 rounded-md border border-danger/20 bg-red-50 p-2 text-xs leading-5 text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
