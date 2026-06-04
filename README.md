# PaperCAT

![PaperCAT desktop cat demo](docs/assets/papercat-demo.gif)

PaperCAT 是一个桌面宠物式论文阅读助手。把 PDF 拖到桌面小猫身上，它会自动缓存论文、解析正文、调用 OpenAI-compatible 大模型生成中文 Markdown 总结，并把阅读记录保存到本地。历史记录页可以直接查看缓存 PDF、阅读 PaperCAT 总结，并针对单篇论文继续和 AI 对话。

## 功能亮点

- 桌面透明小猫窗口：支持拖拽投喂 PDF，并用咀嚼、思考、成功、错误等状态反馈处理进度。
- 自动缓存 PDF：投喂时直接保存到预设缓存目录，无需手动选择保存位置。
- 论文精读总结：基于 `skills/paper-cat-paper-reading/SKILL.md` 的提示词结构，生成适合研究者快速阅读的中文总结。
- 阅读历史：使用 SQLite 保存论文记录、PDF 缓存路径、总结、标签、阅读状态和对话历史。
- 原文同步阅读：历史详情页直接内嵌显示缓存 PDF，不弹保存框，不跳转外部打开。
- 同高阅读栏：`PDF 原文` 和 `PaperCAT 总结` 两个窗口自适应屏幕剩余高度，保持同高并各自滚动。
- 历史检索和管理：支持标题、作者、摘要、标签搜索，支持标签筛选和 `待读 / 在读 / 已读 / 收藏` 状态。
- 重复论文提醒：投喂前会检查是否已有同一路径论文，存在时直接跳转到对应历史记录。
- 单篇论文 AI 对话：每篇论文都有固定对话窗，对话时会把 PDF 可提取正文和总结一起传给模型。
- 流式输出和持久化：AI 回复边生成边显示，对话历史会保存到 SQLite，下次打开仍可继续查看。
- 模型厂商选择：配置大模型时选择厂商和模型即可，用户只需要粘贴 API key，不必手动填写 Base URL。

## 技术栈

- Desktop：Electron + React + Vite + TypeScript + Tailwind CSS
- Backend：Python + FastAPI
- PDF：PyMuPDF + Electron PDF viewer
- Storage：SQLite
- LLM：OpenAI-compatible Chat Completions API

## 项目结构

```text
backend/    FastAPI 后端、PDF 解析、LLM 调用、SQLite 存储
desktop/    Electron 桌面端、小猫 UI、历史记录、PDF 阅读和论文对话界面
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

## 配置

PaperCAT 不会在启动时强制弹出保存路径选择。默认会直接使用本地缓存目录：

```text
backend/outputs/cache/
```

需要调整保存位置或大模型 API 时，可以从小猫菜单手动打开“设置”。

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
3. 小猫会自动缓存 PDF、解析论文并生成总结。
4. 阅读完成后点击小猫气泡里的“查看”，会直接打开历史记录并定位到这篇论文。
5. 历史详情页会同步显示缓存 PDF 原文和 PaperCAT 总结。
6. 右侧固定对话窗可以围绕当前论文继续向 AI 提问。

论文对话快捷键：

- `Enter`：发送消息
- `Ctrl+Enter`：换行
- `Shift+Enter`：换行

## 阅读历史

历史记录页包含三块核心区域：

- 左侧：论文列表、搜索、阅读状态筛选、标签筛选。
- 中间：论文详情、缓存 PDF 原文、PaperCAT 总结。
- 右侧：当前论文的 AI 对话窗口。

每篇论文会显示读取时间标签。新生成的论文会实时同步到历史页并短暂高亮。历史详情中的 `PDF 原文` 和 `PaperCAT 总结` 会自适应屏幕剩余高度，两个窗口保持同高并各自滚动。

## 论文对话

论文对话会自动携带：

- 论文标题、作者、PDF 路径等元信息
- 已生成的 Markdown 总结
- 从缓存 PDF 中提取的正文片段
- 当前论文的对话历史

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

自定义保存路径后，会通过 `backend/secrets/storage.env` 覆盖默认缓存目录。

缓存目录中会保存：

- PDF 副本
- `metadata.json`
- `summary.md`

## 常见问题

后端没有启动：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8766/api/health
```

如果没有返回 `status: ok`，重新运行 `start_papercat.cmd`。

没有配置 API key：

在小猫菜单中打开设置，选择大模型厂商和模型后粘贴 API key。未配置 API key 时，PaperCAT 仍会缓存 PDF 并保存一条本地记录。

历史页没有显示 PDF：

PaperCAT 历史页只读取缓存 PDF。如果缓存文件缺失，请重新投喂一次该论文。

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
