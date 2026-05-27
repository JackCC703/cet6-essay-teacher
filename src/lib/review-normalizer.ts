import type { EssayReview, ReviewRequest } from "@/lib/review-schema";
import {
  calculateConvertedScore,
  CET6_MIN_WORDS,
  CET6_TARGET_MAX_WORDS,
  countEnglishWords,
  getScoreLevel,
  roundToHalf,
  SEVERE_SHORT_ESSAY_WORDS,
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

function applyWordCountScoreLimit(raw: number, wordCount: number): number {
  if (wordCount < SEVERE_SHORT_ESSAY_WORDS) {
    return Math.min(raw, 6);
  }

  if (wordCount < CET6_MIN_WORDS) {
    return Math.min(raw, 8);
  }

  return raw;
}

function ensureWordCountSummary(summary: string, wordCount: number): string {
  if (wordCount >= CET6_MIN_WORDS) {
    return summary;
  }

  if (/(字数不足|低于\s*150|少于\s*150|不足\s*150|未达到\s*150)/.test(summary)) {
    return summary;
  }

  return `${summary} 当前约 ${wordCount} 词，低于六级作文 150 词最低要求，整体评分已按字数不足限分。`;
}

function getRelevanceSummarySentence(
  verdict: EssayReview["relevance"]["verdict"],
): string {
  if (verdict === "off_topic") {
    return "扣题方面：文章明显偏离题目要求，已限制总分。";
  }

  if (verdict === "partially_off_topic") {
    return "扣题方面：文章有部分偏题风险，需要更直接回应题目核心要求。";
  }

  return "扣题方面：文章基本回应题目要求。";
}

function ensureRelevanceSummary(
  summary: string,
  verdict: EssayReview["relevance"]["verdict"],
): string {
  if (/(扣题|切题|跑题|偏题|题目要求|题目核心)/.test(summary)) {
    return summary;
  }

  return `${summary} ${getRelevanceSummarySentence(verdict)}`;
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

const GRAMMAR_ISSUE_PATTERN =
  /(语法|时态|主谓|一致|冠词|介词|词形|词性|单复数|标点|句子结构|句法|谓语|从句|非谓语|grammar|tense|agreement|article|preposition|punctuation|word form|word-form|plural|singular|clause|syntax|predicate)/i;

const NON_GRAMMAR_ONLY_PATTERN =
  /(不自然|口语|过于简单|太简单|比较普通|表达升级|概括力|衔接感|语言质量|重复表达|影响准确性|表达质量|高级表达|可迁移表达)/i;

function isGrammarCorrection(
  issueType: EssayReview["sentenceCorrections"][number]["issueType"],
  issueText: string,
): boolean {
  if (NON_GRAMMAR_ONLY_PATTERN.test(issueText) && !GRAMMAR_ISSUE_PATTERN.test(issueText)) {
    return false;
  }

  return issueType !== "other" || GRAMMAR_ISSUE_PATTERN.test(issueText);
}

function normalizeBreakdownLevel(
  value: unknown,
  fallback: EssayReview["scoreBreakdown"][number]["level"],
): EssayReview["scoreBreakdown"][number]["level"] {
  const text = asString(value).toLowerCase();

  if (["weak", "fair", "good"].includes(text)) {
    return text as EssayReview["scoreBreakdown"][number]["level"];
  }

  if (/(弱|差|不足|低|薄弱)/.test(text)) {
    return "weak";
  }

  if (/(好|强|高|优秀|充分)/.test(text)) {
    return "good";
  }

  if (/(中|一般|尚可|基本|fair)/.test(text)) {
    return "fair";
  }

  return fallback;
}

function normalizeLengthStatus(
  value: unknown,
  wordCount: number,
): EssayReview["lengthDiagnosis"]["status"] {
  const text = asString(value).toLowerCase();

  if (["too_short", "in_range", "over_range"].includes(text)) {
    return text as EssayReview["lengthDiagnosis"]["status"];
  }

  if (/(短|不足|少|short)/.test(text) || wordCount < CET6_MIN_WORDS) {
    return "too_short";
  }

  if (/(长|超|多|over)/.test(text) || wordCount > CET6_TARGET_MAX_WORDS) {
    return "over_range";
  }

  return "in_range";
}

function normalizeStructureStatus(
  value: unknown,
  fallback: EssayReview["structureDiagnosis"][number]["status"],
): EssayReview["structureDiagnosis"][number]["status"] {
  const text = asString(value).toLowerCase();

  if (["missing", "weak", "ok"].includes(text)) {
    return text as EssayReview["structureDiagnosis"][number]["status"];
  }

  if (/(缺失|没有|missing)/.test(text)) {
    return "missing";
  }

  if (/(弱|不足|薄弱|不清楚|weak)/.test(text)) {
    return "weak";
  }

  if (/(好|清楚|完整|ok|完成)/.test(text)) {
    return "ok";
  }

  return fallback;
}

function getOfficialBand(raw: number): EssayReview["officialBand"] {
  if (raw >= 13) {
    return {
      currentBand: "14",
      currentRange: "13-15 分",
      currentDescription:
        "切题，表达思想清楚，文字通顺、连贯，基本无语言错误，仅有个别小错。",
      nextBand: null,
      nextRange: "已达到最高档",
      nextGoal: "保持扣题、连贯和语言准确性，避免不必要的复杂表达造成失误。",
    };
  }

  if (raw >= 10) {
    return {
      currentBand: "11",
      currentRange: "10-12 分",
      currentDescription:
        "切题，表达思想清楚，文字连贯，但有少量语言错误。",
      nextBand: "14",
      nextRange: "13-15 分",
      nextGoal: "减少小错，提升表达自然度和段落衔接，让文章更通顺完整。",
    };
  }

  if (raw >= 7) {
    return {
      currentBand: "8",
      currentRange: "7-9 分",
      currentDescription:
        "基本切题，但部分思想表达不够清楚，文字勉强连贯，语言错误较多。",
      nextBand: "11",
      nextRange: "10-12 分",
      nextGoal: "先保证 150 词以上、观点清楚、主体段展开完整，再减少明显语言错误。",
    };
  }

  if (raw >= 4) {
    return {
      currentBand: "5",
      currentRange: "4-6 分",
      currentDescription:
        "基本切题，但思想表达不清楚，连贯性差，有较多严重语言错误。",
      nextBand: "8",
      nextRange: "7-9 分",
      nextGoal: "先写出完整三段式结构，并围绕题目补足基本理由和例子。",
    };
  }

  return {
    currentBand: "2",
    currentRange: "1-3 分",
    currentDescription:
      "条理不清、思路紊乱，语言支离破碎或多数句子存在严重错误。",
    nextBand: "5",
    nextRange: "4-6 分",
    nextGoal: "先完成扣题短文和基本句子准确性，再考虑表达升级。",
  };
}

function normalizeOfficialBand(
  record: JsonRecord,
  raw: number,
): EssayReview["officialBand"] {
  const fallback = getOfficialBand(raw);
  const currentBand = asString(record.currentBand ?? record.band ?? record["当前档位"]);
  const nextBand = asString(record.nextBand ?? record["目标档位"]);

  return {
    currentBand: ["2", "5", "8", "11", "14"].includes(currentBand)
      ? (currentBand as EssayReview["officialBand"]["currentBand"])
      : fallback.currentBand,
    currentRange: pickString(
      record,
      ["currentRange", "range", "分数范围", "当前范围"],
      fallback.currentRange,
    ),
    currentDescription: pickString(
      record,
      ["currentDescription", "description", "档位描述", "当前描述"],
      fallback.currentDescription,
    ),
    nextBand: ["5", "8", "11", "14"].includes(nextBand)
      ? (nextBand as NonNullable<EssayReview["officialBand"]["nextBand"]>)
      : fallback.nextBand,
    nextRange: pickString(
      record,
      ["nextRange", "目标范围", "下一档范围"],
      fallback.nextRange,
    ),
    nextGoal: pickString(
      record,
      ["nextGoal", "goal", "目标", "提档目标"],
      fallback.nextGoal,
    ),
  };
}

const BREAKDOWN_DEFINITIONS: Array<
  Pick<EssayReview["scoreBreakdown"][number], "dimension" | "label">
> = [
  { dimension: "task_response", label: "扣题与任务完成" },
  { dimension: "content_development", label: "内容展开" },
  { dimension: "organization", label: "结构连贯" },
  { dimension: "language_accuracy", label: "语言准确性" },
  { dimension: "vocabulary_sentence", label: "词汇句式质量" },
];

function defaultBreakdownLevel(raw: number): EssayReview["scoreBreakdown"][number]["level"] {
  if (raw >= 12) {
    return "good";
  }

  if (raw >= 8) {
    return "fair";
  }

  return "weak";
}

function createDefaultScoreBreakdown(
  raw: number,
  wordCount: number,
  verdict: EssayReview["relevance"]["verdict"],
): EssayReview["scoreBreakdown"] {
  const baseLevel = defaultBreakdownLevel(raw);

  return BREAKDOWN_DEFINITIONS.map((definition) => {
    if (definition.dimension === "task_response") {
      return {
        ...definition,
        level: verdict === "on_topic" ? baseLevel : "weak",
        comment:
          verdict === "on_topic"
            ? "基本回应题目要求，后续重点是展开质量。"
            : "题目核心要求回应不足，会先限制总分上限。",
      };
    }

    if (definition.dimension === "content_development") {
      return {
        ...definition,
        level: wordCount < CET6_MIN_WORDS ? "weak" : baseLevel,
        comment:
          wordCount < CET6_MIN_WORDS
            ? "篇幅低于 150 词，理由和例子通常无法充分展开。"
            : "已有基本理由，但需要更多原因链、例子或结果说明。",
      };
    }

    if (definition.dimension === "organization") {
      return {
        ...definition,
        level: baseLevel,
        comment: "需要检查开头表态、主体段分工和结尾回扣是否清楚。",
      };
    }

    if (definition.dimension === "language_accuracy") {
      return {
        ...definition,
        level: baseLevel,
        comment: "语言错误会影响流畅度，但应先保证扣题和完整表达。",
      };
    }

    return {
      ...definition,
      level: baseLevel,
      comment: "表达可完成任务，但需要减少重复并增加自然连接。",
    };
  });
}

function normalizeScoreBreakdown(
  records: JsonRecord[],
  raw: number,
  wordCount: number,
  verdict: EssayReview["relevance"]["verdict"],
): EssayReview["scoreBreakdown"] {
  const fallback = createDefaultScoreBreakdown(raw, wordCount, verdict);

  return BREAKDOWN_DEFINITIONS.map((definition, index) => {
    const matched =
      records.find((item) => asString(item.dimension) === definition.dimension) ??
      records.find((item) => asString(item.label ?? item.name ?? item["维度"]) === definition.label);
    const fallbackItem = fallback[index];

    if (!matched) {
      return fallbackItem;
    }

    return {
      dimension: definition.dimension,
      label: pickString(matched, ["label", "name", "维度"], definition.label),
      level: normalizeBreakdownLevel(matched.level ?? matched["水平"], fallbackItem.level),
      comment: pickString(
        matched,
        ["comment", "analysis", "说明", "评价"],
        fallbackItem.comment,
      ),
    };
  }) as EssayReview["scoreBreakdown"];
}

function createLengthDiagnosis(
  record: JsonRecord,
  wordCount: number,
): EssayReview["lengthDiagnosis"] {
  const status = normalizeLengthStatus(record.status ?? record["状态"], wordCount);
  const missingWords = Math.max(0, CET6_MIN_WORDS - wordCount);
  const suggestions = asStringArray(record.suggestions ?? record["建议"]);

  return {
    wordCount,
    minWords: CET6_MIN_WORDS,
    targetMaxWords: CET6_TARGET_MAX_WORDS,
    status,
    missingWords,
    summary: pickString(
      record,
      ["summary", "comment", "说明", "总结"],
      status === "too_short"
        ? `当前约 ${wordCount} 词，还差 ${missingWords} 词才达到六级最低篇幅。`
        : status === "over_range"
          ? `当前约 ${wordCount} 词，超过 150-200 词的建议范围，需要压缩重复内容。`
          : `当前约 ${wordCount} 词，处在六级作文 150-200 词的建议范围内。`,
    ),
    suggestions:
      suggestions.length > 0
        ? suggestions
        : status === "too_short"
          ? [
              "优先给每个主体段补 1 句原因解释。",
              "至少加入 1 个校园学习或未来工作场景例子。",
              "结尾补 1 句回扣题目意义的总结。",
            ]
          : status === "over_range"
            ? [
                "删掉重复判断句，保留最有信息量的理由。",
                "把过长例子压缩成一句原因或结果说明。",
              ]
            : ["保持当前篇幅，把主要精力放在论证深度和语言准确性上。"],
  };
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function createDefaultStructureDiagnosis(input: ReviewRequest): EssayReview["structureDiagnosis"] {
  const paragraphs = splitParagraphs(input.essay);
  const hasSeparateParagraphs = paragraphs.length >= 3;

  return [
    {
      section: "introduction",
      label: "开头",
      status: paragraphs.length > 0 ? "ok" : "missing",
      finding: paragraphs.length > 0 ? "已有开头内容。" : "缺少明确开头。",
      suggestion: "第一段直接改写题目并给出明确立场。",
    },
    {
      section: "body_1",
      label: "主体段 1",
      status: paragraphs.length >= 2 || !hasSeparateParagraphs ? "weak" : "missing",
      finding: "需要确认是否有清楚的第一个理由和原因解释。",
      suggestion: "用 topic sentence + reason + result 展开一个完整理由。",
    },
    {
      section: "body_2",
      label: "主体段 2",
      status: paragraphs.length >= 3 ? "weak" : "missing",
      finding:
        paragraphs.length >= 3
          ? "已有第二个展开位置，但例子或结果说明还要更具体。"
          : "第二个理由或例子不够独立，容易显得展开不足。",
      suggestion: "补充一个不同角度的理由，最好连接校园学习或未来工作。",
    },
    {
      section: "conclusion",
      label: "结尾",
      status: paragraphs.length >= 2 ? "ok" : "weak",
      finding: paragraphs.length >= 2 ? "文章有收束位置。" : "结尾不够独立。",
      suggestion: "结尾用一句话回扣题目关键词，并提升到学习、成长或职业准备。",
    },
  ];
}

function normalizeStructureDiagnosis(
  records: JsonRecord[],
  input: ReviewRequest,
): EssayReview["structureDiagnosis"] {
  const fallback = createDefaultStructureDiagnosis(input);

  return fallback.map((fallbackItem) => {
    const matched =
      records.find((item) => asString(item.section) === fallbackItem.section) ??
      records.find((item) => asString(item.label ?? item.name ?? item["段落"]) === fallbackItem.label);

    if (!matched) {
      return fallbackItem;
    }

    return {
      section: fallbackItem.section,
      label: pickString(matched, ["label", "name", "段落"], fallbackItem.label),
      status: normalizeStructureStatus(
        matched.status ?? matched["状态"],
        fallbackItem.status,
      ),
      finding: pickString(
        matched,
        ["finding", "problem", "现状", "诊断"],
        fallbackItem.finding,
      ),
      suggestion: pickString(
        matched,
        ["suggestion", "advice", "怎么改", "建议"],
        fallbackItem.suggestion,
      ),
    };
  }) as EssayReview["structureDiagnosis"];
}

function createRevisionPriority(
  records: JsonRecord[],
  wordCount: number,
): EssayReview["revisionPriority"] {
  const steps = records.map((step, index) => ({
    order: Number(step.order ?? step.priority ?? step["顺序"] ?? index + 1),
    action: pickString(step, ["action", "title", "动作", "修改项"], "补强主体段"),
    reason: pickString(
      step,
      ["reason", "why", "原因", "理由"],
      "这是当前最影响分数上限的问题。",
    ),
  }));

  if (steps.length > 0) {
    return {
      steps: steps
        .map((step, index) => ({
          ...step,
          order: Number.isFinite(step.order) && step.order > 0 ? step.order : index + 1,
        }))
        .sort((a, b) => a.order - b.order)
        .slice(0, 5),
    };
  }

  return {
    steps:
      wordCount < CET6_MIN_WORDS
        ? [
            {
              order: 1,
              action: "先补到 150 词以上",
              reason: "低于最低篇幅时，任务完成和内容展开都会被明显限分。",
            },
            {
              order: 2,
              action: "补完整第二个主体理由",
              reason: "第二个理由能让文章从简单表态变成完整论证。",
            },
            {
              order: 3,
              action: "最后处理语法和表达升级",
              reason: "在内容不完整时，单句润色带来的提分有限。",
            },
          ]
        : [
            {
              order: 1,
              action: "先补强主体段原因链",
              reason: "论证深度通常比孤立高级词更影响六级写作档位。",
            },
            {
              order: 2,
              action: "再检查段落衔接和结尾回扣",
              reason: "结构清楚会让阅卷印象更稳定。",
            },
            {
              order: 3,
              action: "最后减少明显语法错误和重复表达",
              reason: "语言准确性决定能否从 8 分档稳定进入 11 分档。",
            },
          ],
  };
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
  const wordCount = countEnglishWords(input.essay);
  const raw = applyWordCountScoreLimit(getRawScore(scoreRecord), wordCount);
  const firstSentence = firstEssaySentence(input);
  const officialBandRecord = getNestedRecord(root, [
    "officialBand",
    "official_band",
    "官方档位",
    "档位映射",
  ]);
  const relevanceRecord = getNestedRecord(root, [
    "relevance",
    "扣题分析",
    "taskRelevance",
  ]);
  const relevanceVerdict = normalizeVerdict(
    relevanceRecord.verdict ?? relevanceRecord["判断"],
  );

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

  const sentenceCorrections = getNestedArray(root, [
    "sentenceCorrections",
    "sentence_corrections",
    "grammarCorrections",
    "逐句语法批改",
  ])
    .map((item) => {
      const issueType = normalizeIssueType(
        item.issueType ?? item.type ?? item["问题类型"],
      );
      const issues = asStringArray(
        item.issues ?? item.issue ?? item.problem ?? item["问题"],
      );
      const explanation = pickString(
        item,
        ["explanation", "reason", "解释", "说明"],
        "修改后修正了该句的语法错误。",
      );
      const issueText = [issueType, ...issues, explanation].join(" ");

      if (!isGrammarCorrection(issueType, issueText)) {
        return null;
      }

      return {
        original: pickString(item, ["original", "source", "原句"], firstSentence),
        issueType,
        issues: issues.length > 0 ? issues : ["该句存在明确语法错误。"],
        corrected: pickString(
          item,
          ["corrected", "correction", "suggestion", "建议修改", "修改后"],
          firstSentence,
        ),
        explanation,
      };
    })
    .filter(
      (item): item is EssayReview["sentenceCorrections"][number] =>
        item !== null,
    );

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
  const scoreSummary = ensureRelevanceSummary(
    ensureWordCountSummary(
      pickString(
        scoreRecord,
        ["summary", "comment", "评价", "总结"],
        wordCount < CET6_MIN_WORDS
          ? "文章存在字数或展开不足问题，需要先补强主体段。"
          : "文章基本完成任务，但仍需提升论证展开和表达质量。",
      ),
      wordCount,
    ),
    relevanceVerdict,
  );

  return {
    score: {
      raw,
      converted: calculateConvertedScore(raw),
      level: normalizeLevel(scoreRecord.level ?? scoreRecord["档位"], raw),
      summary: scoreSummary,
    },
    officialBand: normalizeOfficialBand(officialBandRecord, raw),
    scoreBreakdown: normalizeScoreBreakdown(
      getNestedArray(root, ["scoreBreakdown", "score_breakdown", "评分拆解"]),
      raw,
      wordCount,
      relevanceVerdict,
    ),
    lengthDiagnosis: createLengthDiagnosis(
      getNestedRecord(root, ["lengthDiagnosis", "length_diagnosis", "篇幅诊断", "字数诊断"]),
      wordCount,
    ),
    structureDiagnosis: normalizeStructureDiagnosis(
      getNestedArray(root, [
        "structureDiagnosis",
        "structure_diagnosis",
        "结构诊断",
        "文章骨架",
      ]),
      input,
    ),
    revisionPriority: createRevisionPriority(
      getNestedArray(root, ["revisionPriority", "revision_priority", "修改优先级", "优先修改顺序"]),
      wordCount,
    ),
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
      verdict: relevanceVerdict,
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
