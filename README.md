# 陈颖妍 · 用户研究作品集 | Yingyan Chen — UX Research Portfolio

> 心理学博士（浙江大学）转用户研究（UXR / 人因研究）的求职作品集。
> 里面有两样东西：**3 个 VR 空间导航研究案例** + **4 个我自己做的 AI 用研小工具**。

**🌐 在线访问（点开即用，无需安装）：** https://crischenyingyan.github.io/YingyanChen-ai-portfolio/

---

## 👀 30 秒看懂这个项目

我是一名做**空间导航认知**研究的心理学博士，正在转岗**用户研究**。这个网站是我的作品集，回答面试官两个问题：

1. **我会什么？** —— 用做科研的严谨方法研究「人」：实验设计、问卷/访谈、认知建模、多模态生理信号（EEG/眼动/皮电/fMRI）。主页的「项目案例」用 3 个真实 VR 研究展示了这套能力，其中一项发表在心理学顶刊（JEP: General，一作）。
2. **我能落地吗？** —— 我把常用的研究方法**做成了 4 个能直接在浏览器里用的网页小工具**（问卷生成、PRD 生成、开放题编码、SQL 助手），背后接了真实的 AI 接口。这就是「AI 小工具」板块。

---

## 🗺️ 页面结构与跳转逻辑

整个网站是**一个单页 + 四个工具页**，结构很简单：

```
作品集主页 index.html  （单页滚动，顶部导航三个锚点）
│
├─ #about   关于我   —— 教育背景（校名可点，跳转到我所在实验室主页）+ 两篇论文 + 「为什么心理学博士做用研」
├─ #projects 项目案例 —— 3 张可展开的案例卡（点击卡片展开「概述→背景→角色→方法→发现→洞察→可视化」7 段）
└─ #tools   AI 小工具 —— 4 张工具卡，点「在线体验 →」进入对应工具页
                          │
                          ▼
              tools/survey.html · prd.html · coding.html · sql.html
                          │
                          │  （点工具页里的「✨ AI 生成 / 校验」按钮时）
                          ▼
              Vercel Serverless 接口（tools/api/*）→ 调用 Claude API → 返回结果
```

一句话跳转逻辑：**主页 →（点在线体验）→ 工具页 →（点 AI 按钮）→ 云端 AI 接口 → 结果显示在页面上**。
不点 AI 按钮时，工具页本身也能独立走完流程（如 SQL 工具用浏览器内的 SQLite 直接跑）。

---

## 🧰 4 个 AI 小工具都干什么

| 工具 | 作用 | 方法论依据 |
|---|---|---|
| 📋 **访谈提纲 & 问卷生成器** | 分步引导产出规范问卷/提纲，实时校验诱导性、双重命题、双重否定 | Schwarz、Tourangeau、Kvale |
| 📄 **PRD 生成器** | 9 章框架逐步引导写产品需求文档 + 语言规范自检 | 通用 / 阿里 / 腾讯风格层 |
| 🏷️ **开放题自动编码器** | AI 辅助归纳类目 + 人工复核 + Cohen's κ 信度计算 | 内容分析、主题分析六步 |
| 🧮 **SQL 妙妙小工具** | 导入 CSV → 生成/校验 SQL → 浏览器内真实执行并导出 | sql.js / SQLite WASM |

> 每个工具背后都有一份方法论设计文档，工具本身把「专家才会的方法」变成「谁都能一步步用」的流程。

---

## 🏗️ 技术架构（给技术面试官）

**前端**：纯 HTML / CSS / JavaScript，**零框架、零构建步骤**，一套共享设计系统（`tools/assets/style.css`）+ 通用向导引擎（`tools/assets/wizard.js`，数据驱动：每个工具只写一份步骤配置）。响应式，手机端自适应。

**双托管架构**（这是本项目的一个设计点）：
- **主站** → **GitHub Pages** 托管纯静态页面（就是本仓库）。
- **AI 接口** → **Vercel Serverless Functions**（`tools/api/*.js`，Node 运行时，零第三方依赖）转发到 **Claude API**。
- **密钥安全**：Claude API Key 只存在 Vercel 的服务端环境变量里，**不写进代码、不进仓库**；前端只调用自己的 `/api/*` 接口，拿不到密钥。

**为什么拆两个托管**：GitHub Pages 只能放静态文件、跑不了后端；把需要密钥的 AI 调用隔离到 Vercel，既让主站保持简单快速，又不泄露密钥。

---

## 📁 目录结构

```
YingyanChen-ai-portfolio/
├─ index.html            作品集主页（关于我 / 项目案例 / AI 小工具）
├─ README.md             本文件
├─ assets/
│  └─ 陈颖妍_简历.pdf      简历（主页「下载简历」按钮指向它）
└─ tools/
   ├─ index.html         工具集导航页
   ├─ survey.html        访谈提纲 & 问卷生成器
   ├─ prd.html           PRD 生成器
   ├─ coding.html        开放题自动编码器
   ├─ sql.html           SQL 妙妙小工具
   ├─ assets/
   │  ├─ style.css       共享设计系统（浙大蓝主题）
   │  └─ wizard.js       通用分步向导引擎
   └─ api/               Vercel Serverless 接口（部署时接入 Claude API）
      ├─ _claude.js      共享：鉴权 / 调用 Claude / 解析 JSON
      ├─ polish.js       文本润色
      ├─ generate.js     内容生成
      ├─ code.js         开放题编码
      ├─ sql-gen.js      SQL 生成
      └─ sql-check.js    SQL 校验
```

---

## 🔧 本地运行（可选，面试官一般不需要）

本项目是纯静态站点，直接开在线版即可。若想本地跑：

```bash
# 在仓库根目录
python -m http.server 8000
# 浏览器打开 http://localhost:8000/
```

AI 按钮依赖云端接口，本地默认走线上 Vercel 地址，无需自己配密钥即可体验。

---

## 📮 联系我

- 📧 crischen0627@gmail.com
- 📱 (+86) 13656018677
- 🎓 浙江大学 心理与行为科学系 · 心理学博士（2027 届）｜范德堡大学 访问学者

---

<sub>© 2026 陈颖妍 Yingyan Chen · 用户研究 / 人因研究作品集</sub>
