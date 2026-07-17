# AI 接口（占位）说明 — 部署时填写

这 4 个网页工具的"骨架版"可离线运行分步流程、校验与导出。**需要大模型的步骤**（AI 生成/润色/归类）通过 serverless 接口调用，密钥藏在后端环境变量，前端不接触 key。

## 如何启用
1. 在 Vercel（或任意 serverless 平台）部署本目录下的接口函数。
2. 在平台环境变量里配置你的模型 API Key（如 `ANTHROPIC_API_KEY`），**切勿写进前端代码**。
3. 在各工具页把 `apiBase`（或 `sql.html` 的 `API_BASE`）改为你的接口根地址，例如 `https://your-app.vercel.app`。
4. 未配置时按钮置灰/提示"配置 API 后可用"，不影响其余功能。

## 接口约定（建议实现）

| 接口 | 用途 | 入参 (JSON) | 出参 (JSON) |
|---|---|---|---|
| `POST /api/polish` | 规范表述/润色（问卷、PRD） | `{text, rule, style}` | `{ok, text}` |
| `POST /api/generate` | 据研究问题批量出题（草稿，需人工核） | `{question, dims}` | `{ok, items:[...]}` |
| `POST /api/code` | 开放题逐条归类 | `{answer, codebook}` | `{ok, category, confidence}` |
| `POST /api/sql-gen` | 据表结构+问题生成带注释 SQL | `{schema, question}` | `{ok, sql}` |
| `POST /api/sql-check` | 校验用户 SQL 是否达标 | `{schema, question, sql}` | `{ok, pass, advice}` |

## 安全与合规
- Key 只在 serverless 环境变量，永不出现在前端或仓库。
- 用户上传数据（CSV/答案）默认仅在浏览器内处理（sql.js、编码在前端）；调用 AI 接口时按需最小化上传，并在隐私说明中告知。

## 当前状态（2026-07-16 更新）
- **后端函数已写好**：本目录 `polish.js / generate.js / code.js / sql-gen.js / sql-check.js`（共用 `_claude.js`），Vercel 可直接部署（Node 18+，零依赖）。
- **前端已接线**：wizard 三工具预览栏"✨ AI 润色"按钮 → `/api/polish`；`sql.html`"✨ AI 生成 / 🔍 AI 校验"→ `/api/sql-gen` `/api/sql-check`。未填 `apiBase/API_BASE` 时按钮置灰。
- SQL 执行：已实现（sql.js 在浏览器内跑 SQLite，无需后端）。
- κ 信度：已实现（`coding.html` 内置 Cohen's κ 计算）。
- **逐步部署教程见 `CV_web/AI接口部署操作指南.md`**。
