# PaperCat Desktop Pet Skill

## Purpose

This skill is used to build and iteratively improve **PaperCat / 文献猫咪**, a desktop pet application for academic paper summarization.

The product concept is:

> A QQ-penguin-like desktop cat stays on the user's computer. The user drags a PDF paper onto the cat. The cat opens its mouth, chews the paper, calls a large language model API in the background, and then shows a concise paper summary.

This skill must prioritize a working MVP first. Do not overbuild the product in the first version.

---

## Product Positioning

PaperCat is not a normal PDF upload tool. Its core value is a memorable desktop-pet interaction:

```text
Drag paper → feed cat → cat chews → LLM summarizes → cat shows result
```

The first version should feel like a small desktop companion for researchers, not a full literature management system.

---

## When to Use This Skill

Use this skill when the user asks to:

- Build a desktop pet paper summarization tool
- Develop “文献猫咪”
- Create a QQ-penguin-like cat that summarizes papers
- Implement drag-and-drop PDF summarization on desktop
- Generate a Codex / Claude Code project prompt for PaperCat
- Continue optimizing the PaperCat MVP
- Add features to the existing PaperCat project

Typical user requests include:

- “帮我做文献猫咪第一版”
- “继续优化文献猫咪”
- “给我写一个 PaperCat 的 MVP”
- “把这个做成桌面宠物应用”
- “我把论文拖给猫咪，然后它调用大模型总结”

---

## Core Principle

Always follow this principle:

> First make the complete MVP flow work, then optimize details gradually.

The first version must only focus on the end-to-end flow:

```text
Desktop cat appears
→ User drags PDF to cat
→ Cat changes state and chews
→ Backend parses PDF
→ Backend calls LLM API
→ Summary is returned
→ Cat shows success bubble
→ User opens summary window
→ Summary is saved to local history
```

Do not implement advanced features before this flow is stable.

---

## Recommended Tech Stack

Default stack:

```text
Desktop shell: Electron
Frontend: React + Vite + TypeScript + Tailwind CSS
Backend: Python + FastAPI
PDF parsing: PyMuPDF
Database: SQLite
LLM: OpenAI-compatible API
Output: Markdown summary
```

Why this stack:

- Electron is suitable for transparent, borderless, always-on-top desktop pet windows.
- React is convenient for animation and state-driven UI.
- FastAPI is simple for local backend services.
- PyMuPDF is practical for extracting text from academic PDFs.
- SQLite is enough for local history.
- OpenAI-compatible API allows switching between OpenAI, DeepSeek, Qwen, or other relay services.

Do not switch to Tauri, Qt, LangChain, RAG, or vector databases unless the user explicitly asks.

---

## MVP Feature Scope

The first version must implement only the following features.

### 1. Desktop Cat Window

The application should launch a small cat on the desktop.

Requirements:

- Transparent background
- Borderless window
- Always on top
- Around 180 × 180 px by default
- Can be dragged around the desktop
- Can receive PDF drag-and-drop
- Has a right-click menu

Right-click menu:

```text
Open History
Open Settings
Quit
```

### 2. Cat State Machine

Implement a state-driven cat component.

Required states:

```ts
export type CatState =
  | "idle"
  | "hover"
  | "drag-over"
  | "eating"
  | "chewing"
  | "thinking"
  | "success"
  | "error"
  | "sleeping";
```

State behavior:

#### idle

The cat waits on the desktop.

Bubble examples:

```text
有论文吗，投喂我看看。
把 PDF 拖给我吧喵～
今天也要读论文吗？
```

#### drag-over

Triggered when a PDF is dragged over the cat.

Behavior:

- Cat opens mouth
- Cat becomes visually highlighted
- Bubble says:

```text
这是给我的吗？
快投喂给我！
```

#### eating

Triggered immediately after the PDF is dropped.

Behavior:

- Cat plays swallowing animation
- Lasts about 0.8–1.5 seconds
- Bubble says:

```text
嗷呜！
```

#### chewing

Triggered while the backend parses the PDF or prepares LLM input.

Behavior:

- Cat loops chew animation
- Bubble rotates messages:

```text
正在啃摘要……
正在咀嚼方法部分……
实验部分我也在看了……
```

#### thinking

Triggered while waiting for LLM response.

Behavior:

- Cat switches to thinking animation
- Bubble rotates messages:

```text
我在提炼创新点……
我在归纳实验结论……
我在想这篇值不值得细读……
```

#### success

Triggered when summary is ready.

Behavior:

- Cat shows happy animation
- Bubble says:

```text
我读完啦！
点我查看总结。
```

#### error

Triggered on failure.

Behavior:

- Cat shows sad / dizzy animation
- Bubble shows a friendly error message:

```text
这篇论文我没啃动……
可能是扫描版 PDF，需要 OCR 喵。
大模型 API 好像出问题了。
```

### 3. Drag-and-Drop PDF

The user must be able to drag a local PDF file onto the cat.

Requirements:

- Detect drag enter / drag over / drag leave / drop
- Accept only `.pdf` files
- Reject non-PDF files with friendly cat error
- Get the real local file path through Electron preload / IPC if browser limitations occur
- Send the file path to the local FastAPI backend

### 4. Local Backend

FastAPI backend should run locally at:

```text
http://127.0.0.1:8765
```

Required APIs:

```text
GET /api/health
POST /api/papers/summarize
GET /api/papers
GET /api/papers/{paper_id}
DELETE /api/papers/{paper_id}
```

### 5. PDF Parsing

Use PyMuPDF.

Implement:

```python
def extract_pdf_text(file_path: str) -> dict:
    """
    Returns:
    {
        "text": "...",
        "page_count": 12,
        "metadata": {...}
    }
    """
```

Requirements:

- Check file exists
- Check file extension is PDF
- Open PDF with PyMuPDF
- Extract text page by page
- Prefer `page.get_text("text", sort=True)`
- If text is too short, try block-based extraction
- If no usable text is found, return a clear error saying it may be a scanned PDF
- Limit final text length before sending to LLM

### 6. Paper Cleaning

Implement:

```python
def clean_paper_text(raw_text: str) -> str:
    pass
```

Cleaning goals:

- Remove repeated blank lines
- Remove obvious page numbers
- Remove or truncate references section
- Keep important sections when possible:
  - title
  - abstract
  - introduction
  - method
  - experiment
  - conclusion

Do not over-engineer structure extraction in MVP.

### 7. LLM Summary

Use an OpenAI-compatible API client.

Configuration must be read from `.env`:

```env
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini
```

Requirements:

- Do not hard-code API keys
- Do not print full API keys in logs
- Return friendly errors when API key is missing
- Return friendly errors when the API request fails
- Use timeout and exception handling

### 8. Summary Output

The final summary must be Markdown.

Default structure:

```markdown
# 文献简要报告

## 1. 一句话总结

## 2. 研究背景与问题

## 3. 核心方法

## 4. 实验与结论

## 5. 主要亮点

- 亮点 1
- 亮点 2
- 亮点 3

## 6. 局限性

- 局限 1
- 局限 2
- 局限 3

## 7. 对你研究的启发

## 8. 适合引用的场景
```

Also generate a short comment for the cat bubble, for example:

```text
这篇论文主要提出了一个用于气象降尺度的扩散模型，方法部分值得细读，但实验泛化性还可以进一步加强。
```

### 9. Summary Window

When the summary is ready, clicking the cat or bubble should open a result window.

The result window should show:

- Paper title
- Short comment
- Markdown summary
- Copy Markdown button
- History entry point

MVP can render Markdown as plain text with `white-space: pre-wrap` if Markdown rendering is not yet installed.

### 10. Local History

Use SQLite to save summaries.

Table:

```sql
CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    title TEXT,
    authors TEXT,
    year TEXT,
    file_path TEXT NOT NULL,
    summary_markdown TEXT NOT NULL,
    short_comment TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

History list should show:

- Title
- Created time
- File path
- Short comment
- Tags if available

---

## Project Structure

Use this structure unless there is a strong reason to adjust it.

```text
paper-cat/
├── desktop/
│   ├── electron/
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   └── windows.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── CatPet.tsx
│   │   │   ├── CatBubble.tsx
│   │   │   ├── SummaryWindow.tsx
│   │   │   ├── MarkdownViewer.tsx
│   │   │   ├── HistoryPanel.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useCatState.ts
│   │   │   └── usePaperDrop.ts
│   │   ├── api/
│   │   │   └── paperApi.ts
│   │   ├── types/
│   │   │   └── paper.ts
│   │   └── styles/
│   │       └── index.css
│   ├── assets/
│   │   └── cat/
│   │       ├── idle.png
│   │       ├── open-mouth.png
│   │       ├── chew-1.png
│   │       ├── chew-2.png
│   │       ├── chew-3.png
│   │       ├── thinking.png
│   │       ├── success.png
│   │       └── error.png
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routes/
│   │   │   └── papers.py
│   │   ├── services/
│   │   │   ├── pdf_parser.py
│   │   │   ├── paper_cleaner.py
│   │   │   ├── llm_client.py
│   │   │   ├── summarizer.py
│   │   │   └── storage.py
│   │   └── prompts/
│   │       └── literature_summary_prompt.py
│   ├── data/
│   │   └── papers.db
│   ├── outputs/
│   │   └── summaries/
│   ├── requirements.txt
│   ├── .env.example
│   └── run_backend.py
│
├── skills/
│   └── paper-cat-desktop-pet/
│       └── SKILL.md
│
├── README.md
└── .gitignore
```

---

## Implementation Phases

Always implement in this order.

### Phase 1: Project Skeleton

Tasks:

- Create full directory structure
- Configure Electron + React + Vite + TypeScript + Tailwind
- Configure Python FastAPI backend
- Add `.env.example`
- Add README

Deliverable:

- Both frontend and backend can start
- `/api/health` works

### Phase 2: Desktop Cat Window

Tasks:

- Create transparent borderless always-on-top Electron window
- Render cat component
- Add placeholder cat assets if real assets are missing
- Implement draggable desktop pet
- Implement right-click menu
- Implement cat state machine

Deliverable:

- Cat appears on desktop and can be moved

### Phase 3: PDF Drag-and-Drop

Tasks:

- Implement drag enter / drag over / drag leave / drop
- Accept PDF only
- Reject non-PDF files
- Get real local file path
- Change cat state on drag/drop

Deliverable:

- Dropping a PDF triggers state sequence: `drag-over → eating → chewing`

### Phase 4: Backend Summarization

Tasks:

- Implement PDF text extraction
- Implement paper text cleaning
- Implement LLM client
- Implement summary prompt
- Implement `/api/papers/summarize`
- Add friendly errors

Deliverable:

- Backend can receive PDF path and return Markdown summary

### Phase 5: Result Display

Tasks:

- Connect frontend to backend
- Show chewing / thinking state while waiting
- Show success state when done
- Open summary result window
- Support copying Markdown

Deliverable:

- Full user flow works end to end

### Phase 6: History

Tasks:

- Save summary to SQLite
- Add history list
- Add detail view
- Add delete function

Deliverable:

- Past summaries can be viewed again

---

## Prompt for Paper Summarization

Use this system prompt in the backend.

```text
你是一个学术论文总结助手。用户会提供一篇论文的文本内容。
请输出一份简洁、结构清晰、适合科研人员快速阅读的中文文献报告。

要求：
1. 不要逐段翻译论文。
2. 不要编造论文中没有的信息。
3. 如果论文中没有明确说明某些内容，请写“论文中未明确说明”。
4. 优先总结研究问题、核心方法、实验设计、主要结论、亮点和局限。
5. 输出 Markdown 格式。
6. 风格要简洁、学术、可直接保存为文献笔记。
7. 如果论文与 AI4Earth、遥感、时空预测、气象降尺度、空气质量、时间序列异常检测、Foundation Model、World Model、Benchmark 构建有关，请在“对你研究的启发”部分给出更具体的建议。
```

Required Markdown output:

```markdown
# 文献简要报告

## 1. 一句话总结

用一句话概括这篇论文的核心内容。

## 2. 研究背景与问题

说明论文研究什么问题，为什么重要，现有方法有什么不足。

## 3. 核心方法

概括论文提出的方法、框架、模型或数据集设计。

## 4. 实验与结论

总结使用的数据集、对比方法、评价指标和主要实验结论。

## 5. 主要亮点

- 亮点 1
- 亮点 2
- 亮点 3

## 6. 局限性

- 局限 1
- 局限 2
- 局限 3

## 7. 对你研究的启发

结合 AI4Earth、遥感、时空预测、气象降尺度、空气质量、异常检测、Benchmark 构建等方向，说明这篇论文可以如何借鉴，或者有哪些可延展的论文选题。如果不相关，也要给出通用研究启发。

## 8. 适合引用的场景

说明这篇论文适合放在论文的哪个部分，例如 Introduction、Related Work、Method Motivation、Experiment Setting、Dataset Description 或 Discussion。
```

The backend should also produce a short comment for the cat bubble.

---

## Error Handling

Handle these cases:

1. Dropped file is not a PDF
2. File does not exist
3. PDF cannot be opened
4. PDF text is empty or too short
5. LLM API key is missing
6. LLM request fails
7. Backend service is not running
8. SQLite save fails

User-facing error messages should be cute and short.

Examples:

```text
这不是 PDF，猫咪只吃论文喵。
这篇论文我没啃动，可能是扫描版 PDF。
大模型 API 好像没有配置好。
后端服务没有启动，猫咪现在还没开饭。
```

Console logs should preserve detailed debugging information.

---

## README Requirements

README must include:

1. Project introduction
2. Feature list
3. Tech stack
4. Project structure
5. Backend setup
6. Desktop setup
7. `.env` configuration
8. How to use drag-and-drop PDF summarization
9. Common errors
10. Future roadmap

Example commands:

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run_backend.py

# Windows backend activation
.venv\Scripts\activate

# Desktop
cd desktop
npm install
npm run dev
```

---

## MVP Acceptance Checklist

The first version is complete only if all items below work:

- [ ] Backend starts successfully
- [ ] `/api/health` returns ok
- [ ] Electron desktop app starts successfully
- [ ] Transparent cat window appears on desktop
- [ ] Cat window is borderless and always on top
- [ ] Cat window can be moved
- [ ] Dragging a PDF over the cat changes its state
- [ ] Dropping a PDF starts chewing/thinking animation
- [ ] Backend receives the PDF path
- [ ] PyMuPDF extracts text from the PDF
- [ ] LLM API is called through environment configuration
- [ ] Markdown summary is generated
- [ ] Cat enters success state
- [ ] Clicking cat or bubble opens summary window
- [ ] Markdown can be copied
- [ ] Summary is saved to SQLite
- [ ] History list shows past summaries
- [ ] Friendly errors are shown for common failures

Do not claim MVP completion unless this checklist is satisfied.

---

## Self-Check Prompt After Implementation

After generating the first version, run this self-check:

```markdown
请你现在检查整个 PaperCat 项目是否真的能运行，重点检查：

1. Electron 是否能成功打开透明猫咪窗口；
2. 猫咪窗口是否无边框、透明背景、always-on-top；
3. 拖拽 PDF 是否能拿到真实本地路径；
4. FastAPI `/api/health` 是否能正常访问；
5. `/api/papers/summarize` 是否能接收文件路径；
6. PyMuPDF 是否能解析普通论文 PDF；
7. LLM API 未配置时是否有友好错误；
8. 配置 API 后是否能生成 Markdown 总结；
9. SQLite 是否能保存历史记录；
10. 历史记录是否能在前端查看。

如果发现问题，请直接修改代码，不要只描述问题。
```

---

## Iterative Optimization Roadmap

Only start these after the MVP works.

### Version 0.2: Better Cat Experience

Possible improvements:

- More polished cat assets
- Better chewing animation
- Idle blinking
- Sleeping state after inactivity
- Sound effects
- Cat bubble personality
- Better right-click menu

### Version 0.3: Better Paper Parsing

Possible improvements:

- Better two-column PDF parsing
- Figure caption extraction
- Section-aware extraction
- Better reference removal
- Better title/author/year extraction

### Version 0.4: OCR Support

Possible improvements:

- Detect scanned PDFs
- Optional OCR with PaddleOCR or Tesseract
- Warn user about slower processing

### Version 0.5: Batch Feeding

Possible improvements:

- Drag multiple PDFs
- Cat eats them one by one
- Queue panel
- Batch history
- Batch export

### Version 0.6: Researcher Workflow

Possible improvements:

- Generate related work paragraphs
- Compare multiple papers
- Extract common limitations
- Generate possible research ideas
- Create paper-reading notes in Markdown

### Version 0.7: Zotero Integration

Possible improvements:

- Import Zotero library
- Read selected papers
- Attach summary notes back to Zotero

### Version 0.8: Local Model Mode

Possible improvements:

- Support Ollama
- Support LM Studio
- Local-only privacy mode

---

## Important Constraints

- Do not turn the first version into a large literature management platform.
- Do not add vector databases in MVP.
- Do not add RAG in MVP.
- Do not add OCR in MVP.
- Do not add batch processing in MVP.
- Do not add account login in MVP.
- Do not add cloud sync in MVP.
- Do not spend too much time on perfect cat graphics before the full technical flow works.
- Always prefer a working end-to-end prototype over a beautiful but incomplete demo.

---

## Default Response Style When Using This Skill

When helping the user implement PaperCat:

1. Start with the current development phase.
2. State what should be built next.
3. Give concrete code or a concrete Codex/Claude Code prompt.
4. Avoid vague product advice.
5. Keep pushing toward a runnable MVP.

Example response style:

```text
现在应该先完成 Phase 1 和 Phase 2：项目骨架 + 透明猫咪窗口。先不要接大模型。你可以把下面这段 prompt 给 Codex，让它先生成桌面壳和猫咪状态机。
```

---

## Default Codex / Claude Code Prompt for MVP

Use this prompt when the user wants to start implementation:

```markdown
请根据 `skills/paper-cat-desktop-pet/SKILL.md` 开发 PaperCat / 文献猫咪 MVP。

目标：
完成一个桌面宠物式论文总结应用。用户把 PDF 论文拖到桌面猫咪身上，猫咪播放张嘴、吞咽、咀嚼、思考动画，后端解析 PDF 并调用 OpenAI-compatible LLM API 生成中文 Markdown 文献总结，最后猫咪弹出气泡并打开总结结果窗口。

请严格按照 MVP 范围实现，不要做 OCR、Zotero、批量处理、RAG、账号系统或云同步。

技术栈：
- Electron + React + Vite + TypeScript + Tailwind CSS
- Python + FastAPI
- PyMuPDF
- SQLite
- OpenAI-compatible API

请按以下阶段实现：
1. 项目骨架
2. 透明无边框 always-on-top 猫咪窗口
3. 猫咪状态机
4. PDF 拖拽和本地路径获取
5. FastAPI 后端
6. PDF 文本解析和清洗
7. LLM API 调用
8. Markdown 总结展示
9. SQLite 历史记录
10. README 和运行说明

完成后请运行自检清单，并直接修复发现的问题。
```
