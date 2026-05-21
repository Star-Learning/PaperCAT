# PaperCat / 文献猫咪 MVP

PaperCat 是一个桌面宠物式论文总结工具：把 PDF 拖到桌面小猫身上，小猫会“吃掉”论文，调用本地 FastAPI 后端解析 PDF 并通过 OpenAI-compatible API 生成 Markdown 总结。

## 功能

- Electron 透明、无边框、置顶桌面猫窗口
- PDF 拖拽投喂和猫咪状态动画
- FastAPI 本地后端：`http://127.0.0.1:8766`
- PyMuPDF 提取论文文本
- OpenAI-compatible LLM 摘要
- SQLite 保存历史
- 摘要窗口、复制 Markdown、历史列表、删除历史

## 技术栈

- Desktop：Electron + React + Vite + TypeScript + Tailwind CSS
- Backend：Python + FastAPI
- PDF：PyMuPDF
- Storage：SQLite
- LLM：OpenAI-compatible Chat Completions API

## 项目结构

```text
backend/    FastAPI、PDF 解析、LLM、SQLite
desktop/    Electron 桌面猫和 React UI
skills/     PaperCat 本地技能说明
```

## 后端启动

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run_backend.py
```

macOS/Linux 激活虚拟环境：

```bash
source .venv/bin/activate
```

`.env` 示例：

```env
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini
```

健康检查：

```bash
curl http://127.0.0.1:8766/api/health
```

## 桌面端启动

一键启动整个项目：

```bat
start_papercat.cmd
```

这个脚本会检查依赖、构建桌面端、启动本地后端，并打开桌面猫。
运行日志会写到 `desktop/runtime/logs/`。如果双击后看不到猫，先确认屏幕右下角附近；脚本会在启动前清理本项目旧的 Electron 进程，避免旧窗口和缓存锁互相影响。

手动启动：

```bash
cd desktop
npm install
npm run dev
```

大模型 API 配置可以在桌面猫右侧小三角菜单中的“大模型 API 配置”里填写。真实密钥会保存到 `backend/secrets/llm.env`，该文件已加入 `.gitignore`。

## 打包成桌面应用

生成可拷贝到其他 Windows 电脑的便携版：

```bat
build_windows.cmd
```

打包结果：

- `desktop/release/PaperCat-portable/PaperCat.exe`：解压/拷贝整个 `PaperCat-portable` 文件夹后，双击这个 exe 启动。
- `desktop/release/PaperCat-portable.zip`：发给其他电脑使用的压缩包。

便携版会内置后端程序，运行数据优先保存在 exe 同级的 `PaperCatData/` 目录；如果没有写入权限，会自动退回系统临时目录。

## 使用方式

1. 启动后端。
2. 启动桌面端。
3. 把本地 PDF 拖到小猫身上。
4. 等待小猫进入 chewing/thinking/success。
5. 点击小猫打开总结窗口。
6. 右键小猫可打开 History、Settings 或 Quit。

## 常见错误

- `后端小猫还没醒`：先运行 `python run_backend.py`。
- `还没有配置 LLM_API_KEY`：在 `backend/.env` 填入 API key。
- `小猫没嚼出文字`：PDF 可能是扫描版，MVP 暂不支持 OCR。
- `模型接口暂时没有回应`：检查网络、base URL、模型名或 API key。

## 后续路线

- 更精致的猫咪素材和动画
- 更好的双栏 PDF 解析
- OCR 支持
- 批量投喂
- Zotero 集成
- 本地模型模式
