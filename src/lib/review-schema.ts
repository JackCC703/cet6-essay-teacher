import { z } from "zod";

import { countEnglishWords, MAX_REVIEW_WORDS } from "@/lib/score";

const halfPointScoreSchema = z
  .number()
  .min(0)
  .max(15)
  .refine((value) => Math.abs(value * 2 - Math.round(value * 2)) < 0.0001, {
    message: "raw must use 0.5 increments",
  });

export const ReviewRequestSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(10, "作文题目至少需要 10 个字符。"),
  essay: z
    .string()
    .trim()
    .min(1, "请输入作文内容。")
    .refine((value) => countEnglishWords(value) <= MAX_REVIEW_WORDS, {
      message: `作文最多 ${MAX_REVIEW_WORDS} 个英文单词。`,
    }),
});

export const EssayReviewSchema = z.object({
  score: z.object({
    raw: halfPointScoreSchema,
    converted: z.number().min(0).max(106.5),
    level: z.enum(["low", "medium", "high"]),
    summary: z.string().min(1),
  }),
  officialBand: z.object({
    currentBand: z.enum(["2", "5", "8", "11", "14"]),
    currentRange: z.string().min(1),
    currentDescription: z.string().min(1),
    nextBand: z.enum(["5", "8", "11", "14"]).nullable(),
    nextRange: z.string().min(1),
    nextGoal: z.string().min(1),
  }),
  scoreBreakdown: z
    .array(
      z.object({
        dimension: z.enum([
          "task_response",
          "content_development",
          "organization",
          "language_accuracy",
          "vocabulary_sentence",
        ]),
        label: z.string().min(1),
        level: z.enum(["weak", "fair", "good"]),
        comment: z.string().min(1),
      }),
    )
    .length(5),
  lengthDiagnosis: z.object({
    wordCount: z.number().int().min(0),
    minWords: z.number().int().min(1),
    targetMaxWords: z.number().int().min(1),
    status: z.enum(["too_short", "in_range", "over_range"]),
    missingWords: z.number().int().min(0),
    summary: z.string().min(1),
    suggestions: z.array(z.string().min(1)).min(1),
  }),
  structureDiagnosis: z
    .array(
      z.object({
        section: z.enum(["introduction", "body_1", "body_2", "conclusion"]),
        label: z.string().min(1),
        status: z.enum(["missing", "weak", "ok"]),
        finding: z.string().min(1),
        suggestion: z.string().min(1),
      }),
    )
    .length(4),
  revisionPriority: z.object({
    steps: z
      .array(
        z.object({
          order: z.number().int().min(1),
          action: z.string().min(1),
          reason: z.string().min(1),
        }),
      )
      .min(1)
      .max(5),
  }),
  majorProblems: z
    .array(
      z.object({
        title: z.string().min(1),
        evidence: z.string().min(1),
        impact: z.string().min(1),
        suggestion: z.string().min(1),
      }),
    )
    .min(1),
  relevance: z.object({
    taskRequirements: z.array(z.string().min(1)),
    completed: z.array(z.string().min(1)),
    missing: z.array(z.string().min(1)),
    verdict: z.enum(["on_topic", "partially_off_topic", "off_topic"]),
    explanation: z.string().min(1),
  }),
  sentenceCorrections: z.array(
    z.object({
      original: z.string().min(1),
      issueType: z.enum([
        "grammar",
        "word_form",
        "article",
        "preposition",
        "tense",
        "agreement",
        "punctuation",
        "other",
      ]),
      issues: z.array(z.string().min(1)).min(1),
      corrected: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  expressionUpgrades: z
    .array(
      z.object({
        original: z.string().min(1),
        problem: z.string().min(1),
        saferVersion: z.string().min(1),
        advancedVersion: z.string().min(1),
        explanation: z.string().min(1),
      }),
    )
    .min(1)
    .max(6),
  revisedEssay: z.object({
    content: z.string().min(1),
    explanations: z.array(z.string().min(1)).min(1),
  }),
  nextPractice: z.object({
    focus: z.string().min(1),
    drills: z
      .array(
        z.object({
          title: z.string().min(1),
          instruction: z.string().min(1),
        }),
      )
      .min(1),
  }),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type EssayReview = z.infer<typeof EssayReviewSchema>;
