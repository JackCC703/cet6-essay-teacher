import type { EssayReview } from "@/lib/review-schema";

export type EssayExample = {
  id: string;
  label: string;
  topic: string;
  essay: string;
  review: EssayReview;
};

export const DEMO_EXAMPLE: EssayExample = {
  id: "independent-thinking-demo",
  label: "一键演示完整批改",
  topic:
    "Directions: For this part, you are allowed 30 minutes to write an essay on the importance of developing independent thinking among college students. You should write at least 150 words but no more than 200 words.",
  essay:
    "Nowadays, independent thinking is very important for college students. Many students only follow their teachers and classmates, and they do not have their own ideas. I think this is not good for their future. When they meet new problems, they may wait for other people's answers instead of making their own judgment.\n\nFirst, independent thinking can help students learn knowledge better. If students only remember what teachers say, they may forget it quickly. But if they think by themselves, they can understand the knowledge deeply and use it in exams or projects. Second, independent thinking is useful for work. In the future, companies need people who can solve problems, not just finish simple tasks. A student who can compare different choices will be more prepared for real challenges.\n\nIn conclusion, college students should develop independent thinking. Schools should give students more chances to discuss and solve problems by themselves. Students should also ask more questions and reflect on their own learning.",
  review: {
    score: {
      raw: 10,
      converted: 71,
      level: "medium",
      summary:
        "文章结构完整，语法错误不多，但论证展开偏浅，表达比较普通。扣题方面：文章基本回应题目要求。",
    },
    officialBand: {
      currentBand: "11",
      currentRange: "10-12 分",
      currentDescription:
        "切题，表达思想清楚，文字连贯，但有少量语言错误。",
      nextBand: "14",
      nextRange: "13-15 分",
      nextGoal:
        "减少基础表达和重复句式，补强原因链与段落衔接，让文章更通顺完整。",
    },
    scoreBreakdown: [
      {
        dimension: "task_response",
        label: "扣题与任务完成",
        level: "good",
        comment: "能稳定回应 independent thinking 对大学生的重要性。",
      },
      {
        dimension: "content_development",
        label: "内容展开",
        level: "fair",
        comment: "理由清楚，但校园例子和因果解释仍然偏浅。",
      },
      {
        dimension: "organization",
        label: "结构连贯",
        level: "fair",
        comment: "三段式完整，但第二个主体理由可以独立成段，层次会更清楚。",
      },
      {
        dimension: "language_accuracy",
        label: "语言准确性",
        level: "fair",
        comment: "主要句子能读懂，但存在搭配和指代表达不够自然的问题。",
      },
      {
        dimension: "vocabulary_sentence",
        label: "词汇句式质量",
        level: "fair",
        comment: "高频表达重复，缺少更自然的替换和概括句。",
      },
    ],
    lengthDiagnosis: {
      wordCount: 161,
      minWords: 150,
      targetMaxWords: 200,
      status: "in_range",
      missingWords: 0,
      summary: "当前约 161 词，处在六级作文 150-200 词的建议范围内。",
      suggestions: [
        "保持当前篇幅，不需要继续堆字数。",
        "把新增内容优先放在主体段的原因、例子和结果说明里。",
      ],
    },
    structureDiagnosis: [
      {
        section: "introduction",
        label: "开头",
        status: "ok",
        finding: "开头能引出主题并表明问题。",
        suggestion: "把 I think this is not good 改成更正式、具体的影响句。",
      },
      {
        section: "body_1",
        label: "主体段 1",
        status: "ok",
        finding: "第一个理由围绕学习理解展开。",
        suggestion: "补出具体学习场景，如课堂讨论、项目或考试应用。",
      },
      {
        section: "body_2",
        label: "主体段 2",
        status: "weak",
        finding: "第二个理由和第一个理由挤在同一段，层次不够醒目。",
        suggestion: "把 future work 单独成段，并写出 analyze problems 的结果。",
      },
      {
        section: "conclusion",
        label: "结尾",
        status: "ok",
        finding: "结尾有建议并回到 independent thinking。",
        suggestion: "最后一句再提升到 active learners 或 future development。",
      },
    ],
    revisionPriority: {
      steps: [
        {
          order: 1,
          action: "先把第二个理由独立成段",
          reason: "两个主体理由分开后，结构层次和阅卷印象会更清楚。",
        },
        {
          order: 2,
          action: "给每个理由补一个具体场景",
          reason: "例子和结果能把文章从抽象判断推到更高档位。",
        },
        {
          order: 3,
          action: "最后替换重复表达",
          reason: "在内容完整后，词汇和句式升级才更有效。",
        },
      ],
    },
    majorProblems: [
      {
        title: "论证展开偏浅",
        evidence:
          "First, independent thinking can help students learn knowledge better.",
        impact:
          "主体段提出了理由，但缺少具体场景、原因链和结果说明，内容分很难继续往上走。",
        suggestion:
          "每个主体段用“观点句 + 原因 + 校园例子/未来影响”展开，而不是只写一句抽象判断。",
      },
      {
        title: "表达重复且概括力不足",
        evidence:
          "independent thinking is very important / independent thinking can help / independent thinking is useful",
        impact:
          "核心词反复出现，句式变化少，会限制词汇句式质量分。",
        suggestion:
          "用 this ability、such a habit、thinking independently 等表达替换重复名词。",
      },
      {
        title: "结尾策略偏弱",
        evidence:
          "Schools should give students more chances to discuss and solve problems by themselves.",
        impact:
          "结尾有建议，但没有回扣“为什么对大学生重要”，收束力度不足。",
        suggestion:
          "结尾补一句对学习能力、职业准备或个人成长的总结，让主题回应更完整。",
      },
    ],
    relevance: {
      taskRequirements: [
        "说明大学生培养独立思考的重要性",
        "至少给出清楚观点和理由",
        "控制在 150-200 词左右，并形成完整结构",
      ],
      completed: [
        "全文围绕 independent thinking 展开，没有跑题",
        "有开头、两个主体理由和结尾",
        "观点清楚，读者能理解作者立场",
      ],
      missing: [
        "主体理由缺少具体校园例子",
        "对“大学生”这一对象的针对性还可以更强",
        "结尾没有进一步提升主题高度",
      ],
      verdict: "on_topic",
      explanation:
        "文章扣题稳定，能够回应题目要求；主要问题不在跑题，而在内容展开和表达质量还停留在基础层面。",
    },
    sentenceCorrections: [],
    expressionUpgrades: [
      {
        original: "Nowadays, independent thinking is very important for college students.",
        problem: "开头观点正确，但 very important 比较普通。",
        saferVersion:
          "Nowadays, independent thinking is essential for college students.",
        advancedVersion:
          "Nowadays, independent thinking has become an essential ability for college students who face complex academic and career choices.",
        explanation:
          "稳妥版只替换高频词；高分版补出 academic and career choices，让题目更具体。",
      },
      {
        original:
          "Second, independent thinking is useful for work.",
        problem: "useful for work 表达太泛，缺少六级作文的概括性。",
        saferVersion:
          "Second, independent thinking is useful for future work.",
        advancedVersion:
          "Second, this ability prepares students for future work, where they are expected to analyze problems and make decisions independently.",
        explanation:
          "高分版把“有用”具体化为 analyze problems 和 make decisions，论证更充分。",
      },
      {
        original:
          "Schools should give students more chances to discuss and solve problems by themselves.",
        problem: "建议合理，但表达可以更自然、更像结尾句。",
        saferVersion:
          "Universities should give students more opportunities to discuss ideas and solve problems independently.",
        advancedVersion:
          "Universities should create more discussion-based classes and practical projects, so students can gradually build the habit of independent thinking.",
        explanation:
          "高分版给出具体措施，并回扣 build the habit of independent thinking，结尾更完整。",
      },
    ],
    revisedEssay: {
      content:
        "Nowadays, independent thinking has become an essential ability for college students. Many students simply follow their teachers or classmates instead of forming their own judgments, which may weaken their ability to solve problems in the future.\n\nFirst, independent thinking helps students learn knowledge more deeply. If students only remember what teachers say, they may forget it quickly and fail to use it in real situations. However, when they ask questions and think independently, they can understand the logic behind knowledge. Second, this ability prepares students for future work. Companies need young people who can analyze problems and make reasonable decisions, not those who only wait for instructions.\n\nIn conclusion, college students should develop the habit of independent thinking. Universities should create more discussion-based classes and practical projects, so students can gradually become more active, confident and responsible learners.",
      explanations: [
        "保留原文观点和三段式结构，没有重写成过度高级范文。",
        "补强了主体段的原因链，让“为什么重要”更清楚。",
        "用六级考场可迁移表达替换重复和口语化表达。",
      ],
    },
    nextPractice: {
      focus: "重点练习主体段展开：把一个抽象理由写成有原因、有结果、有例子的完整段落。",
      drills: [
        {
          title: "70 词主体段训练",
          instruction:
            "用 topic sentence + reason + example/result 写一段，主题仍然是 independent thinking。",
        },
        {
          title: "关键词替换训练",
          instruction:
            "把 independent thinking 分别替换为 this ability、such a habit、thinking independently，并写 3 个句子。",
        },
      ],
    },
  },
};
