import type { EssayReview, ReviewRequest } from "@/lib/review-schema";
import {
  calculateConvertedScore,
  countEnglishWords,
  getScoreLevel,
  roundToHalf,
} from "@/lib/score";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function pickString(source: JsonRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = asString(source[key]);

    if (value) {
      return value;
    }
  }

  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }

  const text = asString(value);

  if (!text) {
    return [];
  }

  return text
    .split(/[；;。\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function getNestedRecord(source: JsonRecord, keys: string[]): JsonRecord {
  for (const key of keys) {
    const value = source[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return {};
}

function getNestedArray(source: JsonRecord, keys: string[]): JsonRecord[] {
  for (const key of keys) {
    const value = source[key];
    const items = asRecordArray(value);

    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function getRawScore(score: JsonRecord): number {
  const raw = Number(score.raw ?? score.score ?? score.total ?? score.totalScore);

  if (!Number.isFinite(raw)) {
    return 8;
  }

  return roundToHalf(Math.max(0, Math.min(15, raw)));
}

function normalizeLevel(value: unknown, raw: number): EssayReview["score"]["level"] {
  const text = asString(value).toLowerCase();

  if (["low", "medium", "high"].includes(text)) {
    return text as EssayReview["score"]["level"];
  }

  if (/(低|差|基础|不及格)/.test(text)) {
    return "low";
  }

  if (/(高|好|优秀|较好|偏上)/.test(text)) {
    return raw >= 12.5 ? "high" : "medium";
  }

  if (/(中|一般|普通)/.test(text)) {
    return "medium";
  }

  return getScoreLevel(raw);
}

function normalizeVerdict(value: unknown): EssayReview["relevance"]["verdict"] {
  const text = asString(value).toLowerCase();

  if (["on_topic", "partially_off_topic", "off_topic"].includes(text)) {
    return text as EssayReview["relevance"]["verdict"];
  }

  if (/(跑题|离题|off)/.test(text)) {
    return "off_topic";
  }

  if (/(部分|偏题|基本切题|不完全|partially)/.test(text)) {
    return "partially_off_topic";
  }

  return "on_topic";
}

function normalizeIssueType(
  value: unknown,
): EssayReview["sentenceCorrections"][number]["issueType"] {
  const text = asString(value).toLowerCase();

  if (
    [
      "grammar",
      "word_form",
      "article",
      "preposition",
      "tense",
      "agreement",
      "punctuation",
      "other",
    ].includes(text)
  ) {
    return text as EssayReview["sentenceCorrections"][number]["issueType"];
  }

  if (/冠词|article/.test(text)) {
    return "article";
  }

  if (/介词|preposition/.test(text)) {
    return "preposition";
  }

  if (/时态|tense/.test(text)) {
    return "tense";
  }

  if (/主谓|一致|agreement/.test(text)) {
    return "agreement";
  }

  if (/标点|punctuation/.test(text)) {
    return "punctuation";
  }

  if (/词形|word form|词性/.test(text)) {
    return "word_form";
  }

  if (/语法|grammar/.test(text)) {
    return "grammar";
  }

  return "other";
}

function firstEssaySentence(input: ReviewRequest): string {
  return (
    input.essay
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .find(Boolean) || input.essay.slice(0, 120)
  );
}

export function normalizeEssayReviewPayload(
  payload: unknown,
  input: ReviewRequest,
): EssayReview {
  const root = isRecord(payload) ? payload : {};
  const scoreRecord = getNestedRecord(root, ["score", "评分", "overallScore"]);
  const raw = getRawScore(scoreRecord);
  const wordCount = countEnglishWords(input.essay);
  const firstSentence = firstEssaySentence(input);

  const majorProblems = getNestedArray(root, [
    "majorProblems",
    "major_problems",
    "problems",
    "最大失分问题",
  ]).map((problem, index) => ({
    title: pickString(
      problem,
      ["title", "problem", "issue", "问题", "问题标题"],
      `主要问题 ${index + 1}`,
    ),
    evidence: pickString(
      problem,
      ["evidence", "example", "original", "quote", "原文证据", "证据"],
      firstSentence,
    ),
    impact: pickString(
      problem,
      ["impact", "reason", "explanation", "why", "扣分原因", "为什么扣分"],
      "会影响六级评分中的任务完成、论证展开或语言质量。",
    ),
    suggestion: pickString(
      problem,
      ["suggestion", "advice", "solution", "improvement", "怎么改", "建议"],
      "补充更具体的理由、例子和衔接表达，优先保证扣题和结构完整。",
    ),
  }));

  const relevanceRecord = getNestedRecord(root, [
    "relevance",
    "扣题分析",
    "taskRelevance",
  ]);
  const sentenceCorrections = getNestedArray(root, [
    "sentenceCorrections",
    "sentence_corrections",
    "grammarCorrections",
    "逐句语法批改",
  ]).map((item) => ({
    original: pickString(item, ["original", "source", "原句"], firstSentence),
    issueType: normalizeIssueType(item.issueType ?? item.type ?? item["问题类型"]),
    issues:
      asStringArray(item.issues ?? item.issue ?? item.problem ?? item["问题"])
        .length > 0
        ? asStringArray(item.issues ?? item.issue ?? item.problem ?? item["问题"])
        : ["该句存在表达不自然或影响准确性的问题。"],
    corrected: pickString(
      item,
      ["corrected", "correction", "suggestion", "建议修改", "修改后"],
      firstSentence,
    ),
    explanation: pickString(
      item,
      ["explanation", "reason", "解释", "说明"],
      "修改后表达更准确、自然，更符合六级写作要求。",
    ),
  }));

  const expressionUpgrades = getNestedArray(root, [
    "expressionUpgrades",
    "expression_upgrades",
    "表达升级",
  ]).map((item) => ({
    original: pickString(item, ["original", "source", "原句"], firstSentence),
    problem: pickString(
      item,
      ["problem", "issue", "问题"],
      "表达较普通，概括力或衔接感不足。",
    ),
    saferVersion: pickString(
      item,
      ["saferVersion", "safeVersion", "稳妥版"],
      firstSentence,
    ),
    advancedVersion: pickString(
      item,
      ["advancedVersion", "highScoreVersion", "高分版"],
      firstSentence,
    ),
    explanation: pickString(
      item,
      ["explanation", "reason", "说明"],
      "稳妥版保证准确，高分版适度增强逻辑和表达质量。",
    ),
  }));

  const revisedRecord = root.revisedEssay;
  const revisedEssay = isRecord(revisedRecord)
    ? {
        content: pickString(
          revisedRecord,
          ["content", "essay", "revised", "修改版", "改后文章"],
          input.essay,
        ),
        explanations:
          asStringArray(
            revisedRecord.explanations ??
              revisedRecord.explanation ??
              revisedRecord["修改说明"],
          ).length > 0
            ? asStringArray(
                revisedRecord.explanations ??
                  revisedRecord.explanation ??
                  revisedRecord["修改说明"],
              )
            : ["保留原文观点，补强扣题、结构和表达准确性。"],
      }
    : {
        content: asString(revisedRecord, input.essay),
        explanations: ["保留原文观点，补强扣题、结构和表达准确性。"],
      };

  const nextPracticeRecord = getNestedRecord(root, [
    "nextPractice",
    "next_practice",
    "下一篇练什么",
  ]);

  return {
    score: {
      raw,
      converted: calculateConvertedScore(raw),
      level: normalizeLevel(scoreRecord.level ?? scoreRecord["档位"], raw),
      summary: pickString(
        scoreRecord,
        ["summary", "comment", "评价", "总结"],
        wordCount < 120
          ? "文章存在字数或展开不足问题，需要先补强主体段。"
          : "文章基本完成任务，但仍需提升扣题稳定性、论证展开和表达质量。",
      ),
    },
    majorProblems:
      majorProblems.length > 0
        ? majorProblems
        : [
            {
              title: "论证展开不够充分",
              evidence: firstSentence,
              impact: "理由和例子不足会限制内容展开分和结构分。",
              suggestion: "主体段按观点句、原因、例子或结果展开。",
            },
          ],
    relevance: {
      taskRequirements:
        asStringArray(
          relevanceRecord.taskRequirements ?? relevanceRecord["题目要求"],
        ).length > 0
          ? asStringArray(
              relevanceRecord.taskRequirements ?? relevanceRecord["题目要求"],
            )
          : ["回应题目核心要求", "表达明确观点", "完成六级作文篇幅和结构"],
      completed:
        asStringArray(relevanceRecord.completed ?? relevanceRecord["已完成"])
          .length > 0
          ? asStringArray(relevanceRecord.completed ?? relevanceRecord["已完成"])
          : ["文章形成了基本观点和段落结构"],
      missing:
        asStringArray(relevanceRecord.missing ?? relevanceRecord["缺失"])
          .length > 0
          ? asStringArray(relevanceRecord.missing ?? relevanceRecord["缺失"])
          : ["部分论证仍需更具体"],
      verdict: normalizeVerdict(relevanceRecord.verdict ?? relevanceRecord["判断"]),
      explanation: pickString(
        relevanceRecord,
        ["explanation", "analysis", "说明", "解释"],
        "文章整体能够回应题目，但还需要更清楚地回扣核心要求。",
      ),
    },
    sentenceCorrections,
    expressionUpgrades:
      expressionUpgrades.length > 0
        ? expressionUpgrades.slice(0, 6)
        : [
            {
              original: firstSentence,
              problem: "表达可以更自然、更有概括力。",
              saferVersion: firstSentence,
              advancedVersion: firstSentence,
              explanation: "优先保证准确表达，再适度增加逻辑连接。",
            },
          ],
    revisedEssay,
    nextPractice: {
      focus: pickString(
        nextPracticeRecord,
        ["focus", "重点", "practiceFocus"],
        "重点练习扣题展开和主体段论证。",
      ),
      drills:
        getNestedArray(nextPracticeRecord, ["drills", "练习"]).length > 0
          ? getNestedArray(nextPracticeRecord, ["drills", "练习"]).map(
              (drill, index) => ({
                title: pickString(
                  drill,
                  ["title", "name", "标题"],
                  `练习 ${index + 1}`,
                ),
                instruction: pickString(
                  drill,
                  ["instruction", "task", "要求", "说明"],
                  "按六级作文要求完成一个短段落练习。",
                ),
              }),
            )
          : [
              {
                title: "主体段展开",
                instruction:
                  "用 topic sentence + reason + example/result 写一个 70 词主体段。",
              },
            ],
    },
  };
}
