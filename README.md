# PaperCAT

<p align="center">
  <img src="docs/assets/papercat-cat.svg" alt="PaperCAT desktop cat" width="520">
</p>

PaperCAT 是一个桌面宠物式论文阅读助手。把 PDF 拖给小猫，它会自动缓存论文、解析正文、生成中文总结，并把原文、总结、标签、阅读状态和单篇论文 AI 对话都保存到本地历史记录里。

## 核心功能

- 桌面小猫投喂：拖拽 PDF 后用咀嚼、思考、完成、错误等状态反馈进度。
- 自动缓存：投喂时直接保存 PDF 到预设目录，不再弹出保存位置选择。
- 论文总结：基于 `skills/paper-cat-paper-reading/SKILL.md` 生成结构化中文 Markdown 总结。
- 历史阅读：历史页同步展示缓存 PDF 原文和 PaperCAT 总结，两个阅读窗口同高并可独立滚动。
- 论文管理：支持搜索、标签、阅读状态、时间标签和重复论文提醒。
- 单篇对话：每篇论文都有固定 AI 对话窗，会携带 PDF 正文片段和总结作为上下文，回复支持流式输出。
- 模型配置：内置常见 OpenAI-compatible 厂商和模型选项，用户主要填写 API key。

## 快速启动

Windows 下直接运行：

```bat
start_papercat.cmd
```

已经安装过依赖时可以跳过安装：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\start_papercat.ps1 -SkipInstall
```

健康检查：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8766/api/health
```

## 本地数据

默认数据位置：

```text
backend/data/papers.db
backend/outputs/cache/
```

本地配置和密钥文件：

```text
backend/secrets/llm.env
backend/secrets/storage.env
```

这些文件不会提交到 Git。缓存目录中会保存 PDF 副本、`metadata.json` 和 `summary.md`。

## 项目结构

```text
backend/    FastAPI 后端、PDF 解析、LLM 调用、SQLite 存储
desktop/    Electron + React 桌面端、小猫 UI、历史记录和论文对话
scripts/    启动和打包脚本
skills/     PaperCAT 论文总结 skill
```

## 开发验证

```powershell
cd desktop
npm run build
```

```powershell
cd backend
.\.venv\Scripts\python.exe -m compileall app
```

```powershell
cd desktop
node --check electron\main.cjs
node --check electron\preload.cjs
```

## 可能待完善

- 扫描版 PDF 的 OCR 支持。
- 批量投喂和批量整理论文。
- Zotero、BibTeX 或文献库同步。
- 更细的阅读位置记忆、批注和高亮。
- 本地模型模式和模型连通性测试。
- 更多总结模板，例如复现指南、审稿视角、领域综述卡片。
