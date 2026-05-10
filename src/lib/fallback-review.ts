import type { EssayReview, ReviewRequest } from "@/lib/review-schema";
import {
  calculateConvertedScore,
  countEnglishWords,
  getScoreLevel,
  roundToHalf,
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

  if (wordCount < 80) {
    score = Math.min(score, 6);
  } else if (wordCount < 120) {
    score = Math.min(score, 8);
  } else if (wordCount < 150) {
    score = Math.min(score, 9.5);
  }

  return roundToHalf(score);
}

function createProblemEvidence(essay: string): string {
  const compact = essay.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
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

  if (wordCount < 120) {
    majorProblems.push({
      title: "字数不足会直接压低分数上限",
      evidence: `当前约 ${wordCount} 个英文词。`,
      impact: "六级作文通常要求至少 150 词，少于 120 词时内容展开和任务完成都会明显受限。",
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

  const sentenceCorrections: EssayReview["sentenceCorrections"] = sentences
    .slice(0, 3)
    .map((sentence) => ({
      original: sentence,
      issueType: "other",
      issues: ["本地演示模式无法做精确语法定位，但该句可以在表达自然度上优化。"],
      corrected: upgradeSentence(sentence).saferVersion,
      explanation:
        "真实模型批改会只列出确实有语法或明显不自然问题的句子；这里先给出演示级修改。",
    }));

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
      summary:
        wordCount < 80
          ? "字数严重不足，分数上限被明显限制。"
          : "文章基本能完成写作任务，但论证深度和表达质量仍有提升空间。",
    },
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
        wordCount < 120
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
