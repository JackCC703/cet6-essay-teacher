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

const KEYWORD_STOP_WORDS = new Set([
  "directions",
  "part",
  "allowed",
  "minutes",
  "write",
  "essay",
  "words",
  "should",
  "this",
  "that",
  "with",
  "from",
  "among",
  "college",
  "students",
]);

function getSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getTopicKeywords(topic: string): string[] {
  const words = topic
    .toLowerCase()
    .match(/[a-z]{5,}/g);

  return Array.from(new Set(words ?? [])).filter(
    (word) => !KEYWORD_STOP_WORDS.has(word),
  );
}

function inferRelevance(
  topic: string,
  essay: string,
): EssayReview["relevance"] {
  const keywords = getTopicKeywords(topic);
  const essayLower = essay.toLowerCase();
  const matched = keywords.filter((keyword) => essayLower.includes(keyword));
  const ratio = keywords.length === 0 ? 1 : matched.length / keywords.length;

  if (ratio < 0.15) {
    return {
      taskRequirements: [
        "回应题目核心关键词",
        "围绕题目展开观点与理由",
        "保持六级作文的三段式结构",
      ],
      completed: ["文章形成了基本英文段落"],
      missing: ["题目核心内容回应不足", "论证与题目要求的连接不清楚"],
      verdict: "partially_off_topic",
      explanation:
        "本地演示评分检测到题目关键词覆盖不足，真实批改会由模型进一步判断是否偏题。",
    };
  }

  return {
    taskRequirements: [
      "明确回应题目要求",
      "说明观点并给出理由",
      "控制在六级作文常见篇幅内",
    ],
    completed: ["基本围绕题目展开", "有开头、主体和结尾"],
    missing: ["论证层次还可以更具体", "例证和因果解释略少"],
    verdict: "on_topic",
    explanation:
      "文章基本扣题，但需要把理由展开得更具体，避免只停留在泛泛判断。",
  };
}

function inferRawScore(
  wordCount: number,
  relevance: EssayReview["relevance"]["verdict"],
): number {
  let score = 10;

  if (relevance === "partially_off_topic") {
    score = Math.min(score, 8.5);
  }

  if (relevance === "off_topic") {
    score = Math.min(score, 5);
  }

  if (wordCount < SEVERE_SHORT_ESSAY_WORDS) {
    score = Math.min(score, 6);
  } else if (wordCount < CET6_MIN_WORDS) {
    score = Math.min(score, 8);
  }

  return roundToHalf(score);
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
      nextGoal: "减少小错，提升表达自然度和段落衔接。",
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
      nextGoal: "先保证 150 词以上、观点清楚、主体段展开完整。",
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

function createScoreBreakdown(
  wordCount: number,
  relevance: EssayReview["relevance"]["verdict"],
): EssayReview["scoreBreakdown"] {
  const contentLevel = wordCount < CET6_MIN_WORDS ? "weak" : "fair";
  const taskLevel = relevance === "on_topic" ? "fair" : "weak";

  return [
    {
      dimension: "task_response",
      label: "扣题与任务完成",
      level: taskLevel,
      comment:
        relevance === "on_topic"
          ? "基本回应题目要求，能形成清楚立场。"
          : "题目核心关键词回应不足，会限制总分上限。",
    },
    {
      dimension: "content_development",
      label: "内容展开",
      level: contentLevel,
      comment:
        wordCount < CET6_MIN_WORDS
          ? "篇幅低于 150 词，理由和例子展开不足。"
          : "已有基本理由，但原因链和例子仍偏浅。",
    },
    {
      dimension: "organization",
      label: "结构连贯",
      level: "fair",
      comment: "有基本段落结构，但主体段分工和结尾回扣还可以更清楚。",
    },
    {
      dimension: "language_accuracy",
      label: "语言准确性",
      level: "fair",
      comment: "本地演示无法精确定位全部语法错误，真实批改会进一步判断。",
    },
    {
      dimension: "vocabulary_sentence",
      label: "词汇句式质量",
      level: "fair",
      comment: "表达能完成任务，但重复较多，句式变化和概括力不足。",
    },
  ];
}

function createLengthDiagnosis(wordCount: number): EssayReview["lengthDiagnosis"] {
  const missingWords = Math.max(0, CET6_MIN_WORDS - wordCount);

  if (wordCount < CET6_MIN_WORDS) {
    return {
      wordCount,
      minWords: CET6_MIN_WORDS,
      targetMaxWords: CET6_TARGET_MAX_WORDS,
      status: "too_short",
      missingWords,
      summary: `当前约 ${wordCount} 词，还差 ${missingWords} 词才达到六级最低篇幅。`,
      suggestions: [
        "优先给每个主体段补 1 句原因解释。",
        "至少加入 1 个校园学习或未来工作场景例子。",
        "结尾补 1 句回扣题目意义的总结。",
      ],
    };
  }

  if (wordCount > CET6_TARGET_MAX_WORDS) {
    return {
      wordCount,
      minWords: CET6_MIN_WORDS,
      targetMaxWords: CET6_TARGET_MAX_WORDS,
      status: "over_range",
      missingWords: 0,
      summary: `当前约 ${wordCount} 词，超过 150-200 词的建议范围。`,
      suggestions: ["删掉重复判断句，保留最有信息量的理由。"],
    };
  }

  return {
    wordCount,
    minWords: CET6_MIN_WORDS,
    targetMaxWords: CET6_TARGET_MAX_WORDS,
    status: "in_range",
    missingWords: 0,
    summary: `当前约 ${wordCount} 词，处在六级作文 150-200 词的建议范围内。`,
    suggestions: ["保持当前篇幅，把主要精力放在论证深度和语言准确性上。"],
  };
}

function createStructureDiagnosis(essay: string): EssayReview["structureDiagnosis"] {
  const paragraphs = essay
    .split(/\n{2,}|\r\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

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
      status: paragraphs.length >= 2 ? "weak" : "missing",
      finding: "第一个理由需要更多原因解释。",
      suggestion: "用 topic sentence + reason + result 展开完整理由。",
    },
    {
      section: "body_2",
      label: "主体段 2",
      status: paragraphs.length >= 3 ? "weak" : "missing",
      finding: "第二个理由或例子还不够独立。",
      suggestion: "补充一个不同角度的理由，连接校园学习或未来工作。",
    },
    {
      section: "conclusion",
      label: "结尾",
      status: paragraphs.length >= 2 ? "ok" : "weak",
      finding: paragraphs.length >= 2 ? "文章有收束位置。" : "结尾不够独立。",
      suggestion: "结尾回扣题目关键词，并提升到学习、成长或职业准备。",
    },
  ];
}

function createRevisionPriority(wordCount: number): EssayReview["revisionPriority"] {
  if (wordCount < CET6_MIN_WORDS) {
    return {
      steps: [
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
          reason: "内容不完整时，单句润色带来的提分有限。",
        },
      ],
    };
  }

  return {
    steps: [
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

function createProblemEvidence(essay: string): string {
  const compact = essay.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

function getRelevanceSummary(
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

function upgradeSentence(sentence: string): {
  saferVersion: string;
  advancedVersion: string;
} {
  const withoutEnd = sentence.replace(/[.!?]$/, "");
  const saferVersion = withoutEnd
    .replace(/\bvery important\b/gi, "important")
    .replace(/\bI think\b/gi, "I believe")
    .concat(".");

  const advancedVersion = `${withoutEnd}, which helps make the argument clearer and more convincing.`;

  return {
    saferVersion,
    advancedVersion,
  };
}

function buildRevisedEssay(input: ReviewRequest): string {
  const lowerTopic = input.topic.toLowerCase();

  if (
    lowerTopic.includes("independent thinking") ||
    lowerTopic.includes("independent")
  ) {
    return `Independent thinking is important for college students because it helps them learn more deeply and prepare for future work. If students only accept what teachers or classmates say, they may remember knowledge for a short time but fail to use it in real situations.

First, independent thinking encourages students to ask questions and understand knowledge in their own way. This process can make learning more active and meaningful. Second, it is also useful in the workplace. Companies need young people who can analyze problems, compare different solutions and make reasonable decisions, not those who only wait for instructions.

Therefore, college students should develop the habit of thinking independently. Universities can create more discussion-based classes and practical projects, so that students have more chances to express ideas, solve problems and become more confident learners.`;
  }

  return `The topic deserves serious attention from college students because it is closely related to their study and future development. A clear attitude and practical action are both necessary if students want to deal with this issue well.

To begin with, students should understand why this issue matters instead of only repeating familiar ideas. When they connect the topic with real campus life, their writing will become more specific and convincing. In addition, they should support their opinion with clear reasons and simple examples, so that readers can follow the logic easily.

In conclusion, college students need to respond to the topic with a clear viewpoint, enough explanation and natural language. In this way, the essay can meet the basic requirements of CET-6 writing and leave a better impression on readers.`;
}

export function createFallbackReview(input: ReviewRequest): EssayReview {
  const wordCount = countEnglishWords(input.essay);
  const relevance = inferRelevance(input.topic, input.essay);
  const raw = inferRawScore(wordCount, relevance.verdict);
  const sentences = getSentences(input.essay);
  const expressionTargets = sentences.slice(0, Math.min(3, sentences.length));
  const evidence = createProblemEvidence(input.essay);

  const majorProblems: EssayReview["majorProblems"] = [];

  if (wordCount < CET6_MIN_WORDS) {
    majorProblems.push({
      title: "字数不足会直接压低分数上限",
      evidence: `当前约 ${wordCount} 个英文词。`,
      impact: "六级作文通常要求至少 150 词，低于 150 词时内容展开和任务完成都会明显受限。",
      suggestion: "补充 1 个具体理由和 1 个校园或学习场景例子，把主体段展开到 2 个理由。",
    });
  }

  if (relevance.verdict !== "on_topic") {
    majorProblems.push({
      title: "扣题不够稳定",
      evidence,
      impact: "题目核心关键词回应不足时，评分会先被任务完成度限制，语法正确也很难拿高分。",
      suggestion: "开头第一段直接改写题目关键词，并在每个主体段回扣题目要求。",
    });
  }

  majorProblems.push(
    {
      title: "论证展开偏浅",
      evidence,
      impact: "文章有观点，但理由多停留在判断层面，缺少原因、结果或例子支撑。",
      suggestion: "每个主体段按“观点句 + 原因 + 例子/结果”展开，避免只写抽象结论。",
    },
    {
      title: "表达比较普通",
      evidence: expressionTargets[0] ?? evidence,
      impact: "基础表达可以完成任务，但缺少更自然的连接和概括，会限制语言质量分。",
      suggestion: "优先升级高频句型和连接方式，不要堆砌生僻词。",
    },
  );

  const sentenceCorrections: EssayReview["sentenceCorrections"] = [];

  const expressionUpgrades: EssayReview["expressionUpgrades"] =
    expressionTargets.length > 0
      ? expressionTargets.map((sentence) => {
          const upgraded = upgradeSentence(sentence);
          return {
            original: sentence,
            problem: "表达较直接，概括力和衔接感不足。",
            saferVersion: upgraded.saferVersion,
            advancedVersion: upgraded.advancedVersion,
            explanation:
              "稳妥版保持六级可迁移表达，高分版增加结果或意义说明，让观点更完整。",
          };
        })
      : [
          {
            original: input.essay,
            problem: "正文内容太少，难以选择具体升级句。",
            saferVersion: "The issue is important for college students.",
            advancedVersion:
              "This issue deserves attention because it is closely connected with students' study and future development.",
            explanation: "先补足完整句和明确观点，再考虑表达升级。",
          },
        ];

  return {
    score: {
      raw,
      converted: calculateConvertedScore(raw),
      level: getScoreLevel(raw),
      summary: `${
        wordCount < SEVERE_SHORT_ESSAY_WORDS
          ? "字数严重不足，分数上限被明显限制。"
          : wordCount < CET6_MIN_WORDS
            ? `当前约 ${wordCount} 词，低于六级作文 150 词最低要求，整体评分已按字数不足限分。`
            : "文章基本能完成写作任务，但论证深度和表达质量仍有提升空间。"
      } ${getRelevanceSummary(relevance.verdict)}`,
    },
    officialBand: getOfficialBand(raw),
    scoreBreakdown: createScoreBreakdown(wordCount, relevance.verdict),
    lengthDiagnosis: createLengthDiagnosis(wordCount),
    structureDiagnosis: createStructureDiagnosis(input.essay),
    revisionPriority: createRevisionPriority(wordCount),
    majorProblems: majorProblems.slice(0, 3),
    relevance,
    sentenceCorrections,
    expressionUpgrades,
    revisedEssay: {
      content: buildRevisedEssay(input),
      explanations: [
        "保留原文的基本立场，但把观点展开为更清楚的原因和结果。",
        "使用六级考场可写出的句式，避免过度高级或不自然的表达。",
        "补强段落衔接，让开头、主体和结尾的任务回应更稳定。",
      ],
    },
    nextPractice: {
      focus:
        wordCount < CET6_MIN_WORDS
          ? "先练习把主体段写完整，达到稳定 150 词。"
          : "重点练习观点展开和六级安全表达升级。",
      drills: [
        {
          title: "主体段三步展开",
          instruction:
            "任选一个理由，按 topic sentence + reason + example/result 写 70 词主体段。",
        },
        {
          title: "题目关键词回扣",
          instruction:
            "把题目中的核心名词改写 3 次，并分别放入开头、主体段和结尾。",
        },
      ],
    },
  };
}
