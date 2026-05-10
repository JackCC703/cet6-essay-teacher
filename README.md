# AI 六级作文老师

一个按 CET-6 写作场景工作的 AI 作文批改与提分 MVP。用户可以输入作文题目和作文正文，也可以上传图片进行 OCR 回填，然后生成结构化批改报告。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## 环境变量

复制 `.env.example` 为 `.env.local`，并填入真实 API key：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.moonshot.cn/v1
AI_MODEL=kimi-k2.5
OCR_MODEL=kimi-k2.5
```

未配置 `OPENAI_API_KEY` 时，作文批改接口会走本地演示 fallback；OCR 需要视觉模型 API key。

如果使用 Kimi/Moonshot API，需要配置 OpenAI-compatible base URL。国内平台通常使用 `https://api.moonshot.cn/v1`，国际平台通常使用 `https://api.moonshot.ai/v1`，以你申请 key 的平台为准。

## 验证

```bash
npm run lint
npm run typecheck
npm run build
```
