# AI 六级作文老师 MVP 项目执行文档

这份文档用于直接交给 AI 编码助手执行。目标是做一个可用的 Web MVP：用户输入六级作文题目和作文内容，系统按六级写作逻辑生成结构化批改报告。产品不要做成通用语法纠错器，而要做成“六级作文提分老师”。

## 1. 项目定位

项目名称：AI 六级作文老师

一句话定位：

> 一个按大学英语六级写作场景工作的 AI 作文批改与提分教练，不只改语法，而是指出为什么扣分、怎么提分、下一篇该练什么。

核心差异：

- 先看总分，但模型内部必须优先判断是否扣题。
- 不只给总体评价和语法错误，还要指出最大失分问题。
- 把“语法纠错”和“表达升级”拆开。
- 最后给完整修改版，并解释为什么这样改。
- 改后文章必须像六级考场可写出来的文章，不要写成雅思/托福高分范文。

## 2. MVP 范围

第一版只做一个核心流程：

1. 用户输入作文题目。
2. 用户输入自己的英文作文。
3. 用户也可以拍照上传作文图片。
4. 图片上传后，系统自动识别作文题目和学生作文，并回填到输入框。
5. 用户可以手动修正 OCR 结果。
6. 点击“开始批改”。
7. 后端调用大模型，生成结构化 JSON。
8. 前端渲染批改报告。

暂不做：

- 用户登录。
- 付费系统。
- 历史记录云同步。
- 真题题库后台管理。
- 教师端/班级端。

可以做本地增强：

- 页面内保留本次批改结果。
- 提供 3 个内置示例题目。
- 支持一键填入示例作文，方便演示。

## 3. 推荐技术栈

优先使用：

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zod
- lucide-react
- shadcn/ui 或项目现有 UI 组件

如果当前仓库还没有初始化项目，可以新建 Next.js 项目。所有代码必须严格 TypeScript 类型安全，不允许 `any` 滥用。

建议目录结构：

```txt
src/
  app/
    api/
      ocr/
        route.ts
      review/
        route.ts
    page.tsx
    layout.tsx
    globals.css
  components/
    essay-input-panel.tsx
    image-upload-panel.tsx
    review-report.tsx
    score-card.tsx
    major-problems.tsx
    relevance-analysis.tsx
    sentence-corrections.tsx
    expression-upgrades.tsx
    revised-essay.tsx
  lib/
    review-schema.ts
    review-prompt.ts
    review-service.ts
    ocr-schema.ts
    ocr-prompt.ts
    ocr-service.ts
    score.ts
```

## 4. 页面体验要求

首页直接就是工具，不做营销落地页。

桌面端布局：

- 左侧：图片上传区、作文题目、作文输入框、提交按钮、示例按钮。
- 右侧：批改报告。
- 未批改时，右侧显示简洁空状态，不写大段说明。

移动端布局：

- 上方输入。
- 下方报告。
- 报告模块按顺序折叠或顺序展示。

视觉风格：

- 工具型、清爽、克制。
- 不要大面积渐变背景。
- 不要花哨 hero。
- 卡片圆角不超过 8px。
- 重点信息要适合学生快速扫读。

报告展示顺序必须固定：

1. 总体评分
2. 官方档位映射
3. 评分维度拆解
4. 字数与篇幅诊断
5. 原文结构诊断
6. 优先修改顺序
7. 最大失分问题
8. 扣题分析
9. 逐句语法批改
10. 表达升级
11. 完整改后文章
12. 修改说明

## 5. 用户输入结构

```ts
export type ReviewRequest = {
  topic: string;
  essay: string;
};
```

校验规则：

- `topic` 最少 10 个字符。
- `essay` 至少需要输入正文。
- `essay` 最多 500 个英文单词。
- 如果字数低于 150 词，不要拒绝批改，但报告中要指出字数问题，并限制分数。

图片识别结果结构：

```ts
export type OcrExtractResult = {
  topic: string;
  essay: string;
  confidence: "low" | "medium" | "high";
  warnings: string[];
};
```

OCR 交互规则：

- 用户可以通过文件选择或手机相机上传图片。
- 前端使用 `<input type="file" accept="image/*" capture="environment" />` 支持移动端拍照。
- 支持 `jpg`、`jpeg`、`png`、`webp`。
- 单张图片大小限制建议为 10MB。
- MVP 先支持单图上传；多图上传放到后续版本。
- 上传成功后，自动调用 `/api/ocr`。
- `/api/ocr` 返回 `topic` 和 `essay` 后，自动填入对应 textarea。
- 必须允许用户手动修改 OCR 结果，再点击“开始批改”。
- 如果无法可靠识别题目或作文，仍然回填可识别内容，并在页面展示 `warnings`。

## 6. 批改报告数据结构

后端必须让大模型返回符合以下结构的 JSON。前端只渲染结构化数据，不直接渲染模型自由文本。

```ts
export type EssayReview = {
  score: {
    raw: number; // 0-15，保留 0.5
    converted: number; // raw / 15 * 106.5，保留 1 位小数
    level: "low" | "medium" | "high";
    summary: string; // 中文，一句话评价
  };
  officialBand: {
    currentBand: "2" | "5" | "8" | "11" | "14";
    currentRange: string;
    currentDescription: string;
    nextBand: "5" | "8" | "11" | "14" | null;
    nextRange: string;
    nextGoal: string;
  };
  scoreBreakdown: {
    dimension: "task_response" | "content_development" | "organization" | "language_accuracy" | "vocabulary_sentence";
    label: string;
    level: "weak" | "fair" | "good";
    comment: string;
  }[];
  lengthDiagnosis: {
    wordCount: number;
    minWords: number;
    targetMaxWords: number;
    status: "too_short" | "in_range" | "over_range";
    missingWords: number;
    summary: string;
    suggestions: string[];
  };
  structureDiagnosis: {
    section: "introduction" | "body_1" | "body_2" | "conclusion";
    label: string;
    status: "missing" | "weak" | "ok";
    finding: string;
    suggestion: string;
  }[];
  revisionPriority: {
    steps: {
      order: number;
      action: string;
      reason: string;
    }[];
  };
  majorProblems: {
    title: string;
    evidence: string;
    impact: string;
    suggestion: string;
  }[];
  relevance: {
    taskRequirements: string[];
    completed: string[];
    missing: string[];
    verdict: "on_topic" | "partially_off_topic" | "off_topic";
    explanation: string;
  };
  sentenceCorrections: {
    original: string;
    issueType: "grammar" | "word_form" | "article" | "preposition" | "tense" | "agreement" | "punctuation" | "other";
    issues: string[];
    corrected: string;
    explanation: string;
  }[];
  expressionUpgrades: {
    original: string;
    problem: string;
    saferVersion: string;
    advancedVersion: string;
    explanation: string;
  }[];
  revisedEssay: {
    content: string;
    explanations: string[];
  };
  nextPractice: {
    focus: string;
    drills: {
      title: string;
      instruction: string;
    }[];
  };
};
```

Zod schema 必须和这个 TypeScript 类型保持一致。

## 7. 评分规则

评分采用 0-15 分估算，折算分：

```ts
converted = raw / 15 * 106.5
```

内部评分维度：

- 扣题与任务完成：30%
- 内容展开与论证：25%
- 结构与衔接：20%
- 语言准确性：15%
- 词汇句式质量：10%

硬性限制：

- 明显跑题：最高 5 分。
- 部分跑题：最高 9 分。
- 字数少于 150 英文词：最高 8 分，并必须在总体评价中指出字数不足。
- 字数少于 80 英文词：最高 6 分。
- 只有模板堆砌、几乎没有回应题目：最高 7 分。
- 语法错误多但扣题、结构完整时，不要只因为语法扣到极低分。
- 语法错误少但内容空泛、论证不足时，不能给高分。

分档参考：

- 0-5：低分，跑题/字数严重不足/无法形成完整表达。
- 6-8：基础分，能表达观点，但结构、语法或内容展开明显不足。
- 8.5-10.5：中等，基本扣题，结构完整，但论证浅、表达普通。
- 11-12.5：较好，观点清楚，展开充分，错误较少。
- 13-15：高分，内容充分，逻辑自然，语言准确且有一定表达质量。

## 8. 大模型提示词

在 `src/lib/review-prompt.ts` 中维护提示词，不要散落在 API route 中。

系统提示词：

```txt
你是一个严格但务实的大学英语六级作文批改老师。你的任务不是做通用语法纠错，而是按 CET-6 写作考试场景判断这篇作文为什么扣分，以及如何提分。

你必须遵守：
1. 先在内部判断作文是否扣题，再给总分。
2. 输出语言以简体中文为主，英文原句和改写句保留英文。
3. 不要只关注语法。必须关注扣题、任务完成、论证展开、结构衔接、语言准确性和表达质量。
4. 修改后的文章必须保留用户原本观点，不要重写成完全不同的文章。
5. 改后文章难度要适合六级考场，不要使用过度高级、难以迁移的表达。
6. 逐句语法批改只列出确实有问题或明显不自然的句子，不要机械列出每一句。
7. 表达升级只挑 3-6 个最值得改的句子，区分“稳妥版”和“高分版”。
8. 如果作文跑题、字数不足或模板痕迹明显，必须在最大失分问题里指出。
9. 如果英文词数少于 150，必须在 score.summary 总体评价里明确指出字数不足，并说明已限分。
10. 必须返回 officialBand、scoreBreakdown、lengthDiagnosis、structureDiagnosis、revisionPriority。
11. 必须返回严格 JSON，不要输出 Markdown，不要输出额外解释。
```

用户提示词模板：

```txt
请批改下面这篇大学英语六级作文。

作文题目：
{{topic}}

学生作文：
{{essay}}

请严格返回符合 EssayReview 类型的 JSON。
```

## 9. API 设计

### 作文批改接口

接口：

```txt
POST /api/review
```

请求：

```json
{
  "topic": "Directions: For this part, you are allowed 30 minutes to write an essay...",
  "essay": "Nowadays, many students..."
}
```

响应成功：

```json
{
  "review": {}
}
```

响应失败：

```json
{
  "error": "请输入作文内容。"
}
```

实现要求：

- API route 使用 Zod 校验请求体。
- 调用模型后再次用 Zod 校验返回 JSON。
- 如果模型返回非 JSON，尝试一次自动修复或重新请求。
- 所有错误返回用户可理解的中文信息。
- 不要把 API key 暴露到前端。

环境变量：

```txt
OPENAI_API_KEY=
AI_MODEL=
```

如果项目暂时不用 OpenAI，可以封装成 provider adapter，保证以后能切换模型：

```ts
export async function reviewEssay(input: ReviewRequest): Promise<EssayReview>
```

### 图片识别接口

接口：

```txt
POST /api/ocr
```

请求：

```txt
Content-Type: multipart/form-data
file: image file
```

响应成功：

```json
{
  "result": {
    "topic": "Directions: For this part, you are allowed 30 minutes to write an essay...",
    "essay": "Nowadays, many students...",
    "confidence": "medium",
    "warnings": []
  }
}
```

响应失败：

```json
{
  "error": "图片识别失败，请重新拍照或手动输入。"
}
```

实现要求：

- API route 使用 `formData()` 读取图片。
- 校验文件类型和文件大小。
- 后端调用支持视觉识别的模型或 OCR 服务。
- 识别任务只做抽取，不做批改。
- 必须区分作文题目和学生作文，不要把题目混进作文正文。
- 如果图片里没有明显作文题目，`topic` 可以为空字符串，但要在 `warnings` 中说明。
- 如果手写字迹、拍摄角度或光线导致识别不完整，`confidence` 应为 `low`，并返回 warning。
- 不要把 OCR API key 暴露到前端。

环境变量：

```txt
OCR_MODEL=
```

如果暂时不用独立 OCR 服务，可以先用同一个大模型 provider 封装：

```ts
export async function extractEssayFromImage(file: File): Promise<OcrExtractResult>
```

OCR 系统提示词：

```txt
你是一个 OCR 信息抽取助手。请从用户上传的大学英语六级作文图片中识别两类内容：
1. 作文题目或 Directions。
2. 学生写的英文作文正文。

你必须遵守：
- 只做识别和结构化抽取，不批改作文。
- 不要改写学生作文，不要修正语法错误。
- 尽量保留原文拼写、大小写、标点和换行。
- 如果某些词看不清，用最可能的文本还原，并在 warnings 中说明。
- 如果无法判断题目和正文边界，优先把 Directions、要求、题干放入 topic，把学生连续写作内容放入 essay。
- 必须返回严格 JSON，不要输出 Markdown，不要输出额外解释。
```

## 10. 前端模块要求

### EssayInputPanel

功能：

- 图片上传/拍照入口。
- 图片识别 loading 状态。
- OCR 结果自动回填。
- OCR warning 展示。
- 题目输入 textarea。
- 作文输入 textarea。
- 字数统计。
- 提交按钮 loading 状态。
- 示例填充按钮。

交互：

- 字数不足时可以提示，但不阻止用户编辑。
- 图片识别完成后不自动提交批改，必须让用户确认或手动修改后再提交。
- OCR 失败时不清空用户已经输入的内容。
- 提交中禁用按钮。
- 出错时展示中文错误。

### ReviewReport

按固定顺序渲染：

1. `ScoreCard`
2. `MajorProblems`
3. `RelevanceAnalysis`
4. `SentenceCorrections`
5. `ExpressionUpgrades`
6. `RevisedEssay`
7. `NextPractice`

### ScoreCard

展示：

- `raw / 15`
- `converted / 106.5`
- 档位：低分/中等/较好
- 一句话评价

### MajorProblems

展示前三个最大问题。每个问题包含：

- 问题标题
- 原文证据
- 为什么扣分
- 怎么改

### RelevanceAnalysis

必须清楚展示：

- 题目要求
- 已完成
- 缺失
- 判断：扣题/部分偏题/跑题

### SentenceCorrections

展示逐句语法批改：

- 原句
- 问题
- 建议修改
- 中文解释

### ExpressionUpgrades

展示表达升级：

- 原句
- 问题
- 稳妥版
- 高分版
- 为什么这样改

### RevisedEssay

展示完整修改版和修改说明。

注意：完整修改版不要和表达升级重复解释太多，重点说明整体改动策略。

## 11. 示例测试数据

示例题目：

```txt
Directions: For this part, you are allowed 30 minutes to write an essay on the importance of developing independent thinking among college students. You should write at least 150 words but no more than 200 words.
```

中等作文示例：

```txt
Nowadays, independent thinking is very important for college students. Many students only follow their teachers and classmates, and they do not have their own ideas. I think this is not good for their future.

First, independent thinking can help students learn knowledge better. If students only remember what teachers say, they may forget it quickly. But if they think by themselves, they can understand the knowledge deeply. Second, independent thinking is useful for work. In the future, companies need people who can solve problems, not just finish simple tasks.

In conclusion, college students should develop independent thinking. Schools should give students more chances to discuss and solve problems by themselves.
```

这个示例的合理批改倾向：

- 没有跑题。
- 结构完整。
- 论证偏浅。
- 表达比较普通。
- 语法错误不多。
- 预估分数约 9.5-11 / 15。

## 12. 验收标准

完成后必须满足：

- 可以启动本地开发服务器。
- 首页直接可输入题目和作文。
- 首页支持拍照或图片上传。
- 图片上传后能自动识别题目和作文内容，并回填到输入框。
- OCR 结果允许用户手动修改。
- 点击批改后能得到完整报告。
- 报告顺序符合本文档要求。
- 分数、最大问题、扣题分析、语法批改、表达升级、改后全文都能正常展示。
- 模型返回错误或网络错误时，页面不会崩溃。
- TypeScript 无类型错误。
- 主要 schema 有 Zod 校验。
- UI 在手机宽度下不溢出、不重叠。

建议验证命令：

```bash
npm run lint
npm run typecheck
npm run build
```

如果项目没有对应脚本，请补齐。

## 13. 后续版本方向

MVP 完成后再考虑：

- 批改历史。
- 用户弱点画像。
- 真题题库。
- 考前 14 天训练计划。
- 每次批改后自动生成针对性练习。
- 同一篇作文生成“稳妥版”和“高分版”。
- 四级作文模式。
- 考研英语作文模式。

## 14. 给 AI 编码助手的执行指令

你需要基于本文档完成一个生产可运行的 MVP。请按以下顺序执行：

1. 检查当前仓库结构和技术栈。
2. 如果没有项目，初始化 Next.js + TypeScript 项目。
3. 建立 `ReviewRequest`、`EssayReview` 类型和 Zod schema。
4. 建立 `OcrExtractResult` 类型和 Zod schema。
5. 实现 OCR 提示词与 `extractEssayFromImage` 服务。
6. 实现模型提示词与 `reviewEssay` 服务。
7. 实现 `/api/ocr` 接口。
8. 实现 `/api/review` 接口。
9. 实现首页输入区、图片上传区和报告展示区。
10. 加入示例题目与示例作文。
11. 完成错误处理、loading 状态和移动端样式。
12. 运行 lint、typecheck、build。
13. 启动本地开发服务器，并说明访问地址。

不要把这个产品做成普通语法纠错器。核心体验必须是：先给总体评分，再指出最大失分问题，判断扣题，逐句纠错，升级表达，给完整改后文章，并解释为什么这样改。
