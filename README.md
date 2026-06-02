# PaperCAT

![PaperCAT desktop cat demo](docs/assets/papercat-demo.gif)

PaperCAT 是一个桌面宠物式论文阅读助手。把 PDF 拖到桌面小猫身上，它会解析论文、调用 OpenAI-compatible 大模型生成中文 Markdown 总结，并把阅读记录保存到本地。每篇历史论文旁边还可以打开独立的 AI 对话小窗，继续围绕这篇论文追问。

## 功能亮点

- 桌面透明小猫窗口：支持拖拽投喂 PDF，并用咀嚼、思考、成功、错误等状态反馈处理进度。
- 论文精读总结：基于 `skills/paper-cat-paper-reading/SKILL.md` 的提示词结构，生成适合研究者快速阅读的中文总结。
- 阅读历史：使用 SQLite 保存论文记录、PDF 缓存和总结内容，历史页会实时同步新生成的论文。
- 重复论文提醒：投喂前会检查缓存中是否已有同一路径的论文，存在时直接跳转到历史记录。
- 单篇论文 AI 对话：每篇历史记录都带一个固定悬浮对话窗，对话时会把该论文 PDF 文本和总结一并传给模型。
- 流式输出：论文对话支持边生成边显示，等待时小猫会联动进入思考状态。
- 首次配置：保存路径和大模型 API 服务都可以在首次启动时配置，也可以跳过后续再设置。
- 模型厂商选择：配置大模型时选择厂商和模型即可，用户只需要粘贴 API key，不必手动填写 Base URL。

## 技术栈

- Desktop：Electron + React + Vite + TypeScript + Tailwind CSS
- Backend：Python + FastAPI
- PDF：PyMuPDF
- Storage：SQLite
- LLM：OpenAI-compatible Chat Completions API

## 项目结构

```text
backend/    FastAPI 后端、PDF 解析、LLM 调用、SQLite 存储
desktop/    Electron 桌面端、小猫 UI、历史记录和论文对话界面
scripts/    启动、打包等辅助脚本
skills/     PaperCAT 论文总结 skill
release/    发布相关输出目录
```

## 快速启动

Windows 下推荐直接运行：

```bat
start_papercat.cmd
```

脚本会自动：

- 创建或复用 `backend/.venv`
- 安装前后端依赖
- 构建桌面端
- 启动本地 FastAPI 后端
- 打开 Electron 桌面小猫

运行日志会写入：

```text
desktop/runtime/logs/
```

如果已经安装过依赖，也可以跳过依赖安装：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\start_papercat.ps1 -SkipInstall
```

## 手动启动

后端：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe run_backend.py
```

桌面端：

```powershell
cd desktop
npm install
npm run dev
```

健康检查：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8766/api/health
```

## 首次配置

第一次启动后，可以在配置窗口里设置两类信息：

- 保存路径：选择论文缓存和总结输出保存目录。
- 大模型 API：选择厂商、模型并粘贴 API key。

这两部分都可以跳过。跳过后仍可打开小猫菜单中的“设置”继续配置。

当前大模型配置以 OpenAI-compatible API 为核心，支持的常见厂商包括：

- OpenAI
- DeepSeek
- DashScope / 通义千问
- Moonshot / Kimi
- Zhipu GLM
- SiliconFlow
- OpenRouter

配置会保存到本地 secret 文件，不会提交到 Git：

```text
backend/secrets/llm.env
backend/secrets/storage.env
```

基础环境配置示例位于：

```text
backend/.env.example
```

## 使用方式

1. 启动 PaperCAT。
2. 把本地 PDF 拖到桌面小猫身上。
3. 小猫会进入处理状态并生成论文总结。
4. 点击小猫打开当前论文总结窗口。
5. 从小猫菜单打开历史记录，查看所有已读论文。
6. 在历史记录中选择任意论文，右侧固定对话窗可以围绕该论文继续问 AI。

论文对话快捷键：

- `Enter`：发送消息
- `Ctrl+Enter`：换行
- `Shift+Enter`：换行

## 阅读历史和论文对话

每篇历史记录会显示读取时间标签。新生成的论文会在历史页面实时出现，并短暂高亮，方便确认刚刚加入的记录。

论文对话会自动携带：

- 论文标题、作者、PDF 路径等元信息
- 已生成的 Markdown 总结
- 从 PDF 中提取的正文片段

因此用户可以直接问：

- “这篇论文的核心贡献是什么？”
- “帮我解释方法部分的关键模块。”
- “实验结果有没有明显短板？”
- “如果我要复现，应该先看哪些细节？”

## 打包

生成 Windows 便携版：

```bat
build_windows.cmd
```

常见输出：

```text
desktop/release/PaperCat-portable/PaperCat.exe
desktop/release/PaperCat-portable.zip
```

便携版会内置后端程序。运行数据优先保存到 exe 同级的 `PaperCatData/`，如果没有写入权限，会自动退回系统临时目录。

## 数据和缓存

默认数据位置：

```text
backend/data/papers.db
backend/outputs/cache/
```

用户自定义保存路径后，会通过 `backend/secrets/storage.env` 覆盖默认缓存目录。

## 常见问题

后端没有启动：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8766/api/health
```

如果没有返回 `status: ok`，重新运行 `start_papercat.cmd`。

没有配置 API key：

在小猫菜单中打开设置，选择大模型厂商和模型后粘贴 API key。

PDF 没有生成有效总结：

该 PDF 可能是扫描版或文本提取质量较差。当前版本依赖 PyMuPDF 提取文本，暂未内置 OCR。

模型接口没有响应：

检查网络、API key、厂商服务状态和所选模型是否可用。

## 开发验证

常用验证命令：

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

## 路线想法

- OCR 支持
- 批量投喂论文
- Zotero 集成
- 本地模型模式
- 更细的论文标签和检索能力
