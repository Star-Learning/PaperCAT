# PaperCAT v0.1

<p align="center">
  <img src="docs/assets/papercat-cat.svg" alt="PaperCAT desktop cat" width="520">
</p>

PaperCAT v0.1 是一个桌面宠物式论文阅读助手。把 PDF 拖给小猫，它会自动缓存论文、解析正文、生成中文总结，并把原文、总结、标签、阅读状态和单篇论文 AI 对话都保存到本地历史记录里。

当前版本定位是一个可用的早期版本：先把“投喂论文 -> 自动总结 -> 历史阅读 -> 单篇对话”这条主流程跑通，后续再继续增强论文理解能力和小猫本身的可玩性。

## 代码结构

```text
PaperCAT/
├─ backend/                  FastAPI 后端
│  ├─ app/
│  │  ├─ routes/             设置、论文记录等 API 路由
│  │  ├─ services/           PDF 缓存、解析、总结、论文对话、LLM 调用
│  │  ├─ prompts/            论文总结提示词
│  │  ├─ config.py           路径、密钥、模型等配置读取
│  │  ├─ database.py         SQLite 初始化和连接
│  │  └─ models.py           数据表模型
│  ├─ data/                  本地 SQLite 数据库
│  ├─ outputs/cache/         默认 PDF 缓存目录
│  ├─ secrets/               本地 API key 和保存路径配置
│  └─ run_backend.py         后端启动入口
├─ desktop/                  Electron + React 桌面端
│  ├─ electron/              主进程、预加载脚本、窗口管理
│  └─ src/
│     ├─ components/         小猫、设置、历史记录、PDF 阅读、论文对话 UI
│     ├─ hooks/              小猫状态和 PDF 拖拽逻辑
│     ├─ api/                前端请求后端的 API 封装
│     └─ styles/             全局样式和小猫动画
├─ docs/assets/              README 图片和界面预览
├─ scripts/                  启动脚本
├─ skills/                   PaperCAT 论文总结 skill
└─ start_papercat.cmd        Windows 一键启动入口
```

## 核心功能

- 桌面小猫投喂：拖拽 PDF 后用咀嚼、思考、完成、错误等状态反馈进度。
- 自动缓存：投喂时直接保存 PDF 到预设目录，不再弹出保存位置选择。
- 论文总结：基于 `skills/paper-cat-paper-reading/SKILL.md` 生成结构化中文 Markdown 总结。
- 历史阅读：历史页同步展示缓存 PDF 原文和 PaperCAT 总结，两个阅读窗口同高并可独立滚动。
- 论文管理：支持搜索、标签、阅读状态、时间标签和重复论文提醒。
- 单篇对话：每篇论文都有固定 AI 对话窗，会携带 PDF 正文片段和总结作为上下文，回复支持流式输出。
- 模型配置：内置常见 OpenAI-compatible 厂商和模型选项，用户主要填写 API key。

## 界面预览

配置保存路径和大模型 API：

![PaperCAT 设置界面](docs/assets/papercat-settings-screen.svg)

查看论文原文、总结和单篇对话：

![PaperCAT 历史阅读界面](docs/assets/papercat-history-screen.svg)

## 快速启动

当前阶段不需要先打包，直接把代码 clone 到本地后启动即可。

> **小提示：如果你正在使用 Claude Code 或 Codex，也可以让它先阅读理解项目结构，再直接在本地执行启动脚本。**

准备环境：

- Windows
- Git
- Python 3.10+
- Node.js 18+

克隆并进入项目：

```powershell
git clone https://github.com/Star-Learning/PaperCAT.git
cd PaperCAT
```

首次启动：

```bat
start_papercat.cmd
```

这个脚本会自动创建 Python 虚拟环境、安装前后端依赖、启动 FastAPI 后端，并打开 Electron 桌面小猫。

已经安装过依赖时，可以跳过依赖安装：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\start_papercat.ps1 -SkipInstall
```

后端健康检查：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8766/api/health
```

看到 `status: ok` 就说明后端已经启动。

## 配置流程

第一次打开时，如果暂时不想配置保存路径或大模型 API，可以先跳过。之后随时可以从小猫菜单打开“设置”。

保存路径配置：

1. 打开小猫菜单里的“设置”。
2. 在保存路径区域选择或填写论文缓存目录。
3. 保存后，之后投喂的 PDF 会自动复制到这个目录，不会再弹出保存文件选择框。

如果没有手动配置，默认使用：

```text
backend/outputs/cache/
```

大模型 API 配置：

1. 打开小猫菜单里的“设置”。
2. 选择大模型厂商，例如 OpenAI、DeepSeek、DashScope、Kimi、智谱、SiliconFlow 或 OpenRouter。
3. 选择模型。
4. 粘贴对应厂商的 API key。
5. 保存配置。

一般不需要手动填写 Base URL，PaperCAT 会根据厂商选项自动配置 OpenAI-compatible 接口地址。

本地配置和密钥文件：

```text
backend/secrets/llm.env
backend/secrets/storage.env
```

这些文件不会提交到 Git。

## 本地数据

默认数据位置：

```text
backend/data/papers.db
backend/outputs/cache/
```

缓存目录中会保存 PDF 副本、`metadata.json` 和 `summary.md`。历史记录、标签、阅读状态和论文对话会写入 SQLite。

## Todo List

论文读取和总结：

- [ ] 扫描版 PDF 的 OCR 支持。
- [ ] 批量投喂和批量整理论文。
- [ ] Zotero、BibTeX 或文献库同步。
- [ ] 更细的阅读位置记忆、批注和高亮。
- [ ] 本地模型模式和模型连通性测试。
- [ ] 更多总结模板，例如复现指南、审稿视角、领域综述卡片。

小猫可玩性：

- [ ] 更丰富的小猫动作、表情和状态反馈。
- [ ] 根据阅读进度改变小猫心情。
- [ ] 论文读完后的趣味反馈和阅读小结提醒。
- [ ] 长时间未阅读时的温和提醒。
- [ ] 自定义小猫外观和性格。
