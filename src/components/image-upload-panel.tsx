"use client";

import { Camera, ImageUp, Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";

import type { OcrExtractResult } from "@/lib/ocr-schema";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const OCR_IMAGE_MAX_LONG_EDGE = 1800;
const OCR_IMAGE_JPEG_QUALITY = 0.78;
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

type PreparedOcrImage = {
  file: File;
  originalSize: number;
  uploadSize: number;
  originalWidth?: number;
  originalHeight?: number;
  uploadWidth?: number;
  uploadHeight?: number;
  compressed: boolean;
  elapsedMs: number;
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

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function getJpegFileName(fileName: string): string {
  const trimmedName = fileName.trim();
  const extensionIndex = trimmedName.lastIndexOf(".");
  const baseName =
    extensionIndex > 0 ? trimmedName.slice(0, extensionIndex) : trimmedName;

  return `${baseName || "essay"}-ocr.jpg`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("图片读取失败，请重新选择图片。"));
    };
    image.src = imageUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("图片压缩失败，将无法上传压缩图。"));
      },
      "image/jpeg",
      quality,
    );
  });
}

function createUncompressedOcrImage(
  file: File,
  startedAt: number,
): PreparedOcrImage {
  return {
    file,
    originalSize: file.size,
    uploadSize: file.size,
    compressed: false,
    elapsedMs: performance.now() - startedAt,
  };
}

async function prepareImageForOcr(file: File): Promise<PreparedOcrImage> {
  const startedAt = performance.now();
  const image = await loadImage(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;

  if (originalWidth <= 0 || originalHeight <= 0) {
    return createUncompressedOcrImage(file, startedAt);
  }

  const scale = Math.min(
    1,
    OCR_IMAGE_MAX_LONG_EDGE / Math.max(originalWidth, originalHeight),
  );
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));
  const shouldResize = scale < 1;
  const shouldReencode =
    file.type !== "image/jpeg" && file.type !== "image/jpg";

  if (!shouldResize && !shouldReencode) {
    return {
      file,
      originalSize: file.size,
      uploadSize: file.size,
      originalWidth,
      originalHeight,
      uploadWidth: originalWidth,
      uploadHeight: originalHeight,
      compressed: false,
      elapsedMs: performance.now() - startedAt,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return createUncompressedOcrImage(file, startedAt);
  }

  context.imageSmoothingQuality = "high";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await canvasToBlob(canvas, OCR_IMAGE_JPEG_QUALITY);
  const compressedFile = new File([blob], getJpegFileName(file.name), {
    lastModified: file.lastModified,
    type: "image/jpeg",
  });
  const shouldUseCompressed = shouldResize || compressedFile.size < file.size;
  const uploadFile = shouldUseCompressed ? compressedFile : file;

  return {
    file: uploadFile,
    originalSize: file.size,
    uploadSize: uploadFile.size,
    originalWidth,
    originalHeight,
    uploadWidth: shouldUseCompressed ? targetWidth : originalWidth,
    uploadHeight: shouldUseCompressed ? targetHeight : originalHeight,
    compressed: shouldUseCompressed,
    elapsedMs: performance.now() - startedAt,
  };
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

    const requestId = createRequestId();
    setIsLoading(true);

    try {
      const totalStartedAt = performance.now();
      let preparedImage: PreparedOcrImage;

      try {
        preparedImage = await prepareImageForOcr(file);
      } catch (compressionError) {
        console.warn(
          `[ocr:${requestId}] 图片压缩失败，降级上传原图。`,
          compressionError,
        );
        preparedImage = createUncompressedOcrImage(file, totalStartedAt);
      }

      console.info(
        `[ocr:${requestId}] 图片准备完成：${formatBytes(
          preparedImage.originalSize,
        )} -> ${formatBytes(preparedImage.uploadSize)}，` +
          `尺寸 ${preparedImage.originalWidth ?? "unknown"}x${
            preparedImage.originalHeight ?? "unknown"
          } -> ${preparedImage.uploadWidth ?? "unknown"}x${
            preparedImage.uploadHeight ?? "unknown"
          }，压缩=${preparedImage.compressed}，耗时=${Math.round(
            preparedImage.elapsedMs,
          )}ms`,
      );

      const formData = new FormData();
      formData.append("file", preparedImage.file);
      formData.append("requestId", requestId);

      const fetchStartedAt = performance.now();
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json();
      const fetchElapsedMs = Math.round(performance.now() - fetchStartedAt);

      console.info(
        `[ocr:${requestId}] OCR 请求完成：status=${response.status}，请求耗时=${fetchElapsedMs}ms，总耗时=${Math.round(
          performance.now() - totalStartedAt,
        )}ms`,
      );

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
