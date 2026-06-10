---
name: paper-cat-paper-reading
description: Generate concise, factual Chinese Markdown research-paper summaries for PaperCAT desktop reading history. Use when PaperCAT summarizes a PDF into a reader-friendly academic digest rather than a long public-account article.
---

# PaperCAT 论文精读总结 Skill

## Goal

Given extracted PDF text and metadata, generate a Chinese Markdown summary that helps a researcher quickly decide what the paper does, why it matters, how it works, and what to ask next.

This skill is adapted from `C:\work\vibe-article\SKILL.md`, but scoped for PaperCAT's desktop reading history:

- No screenshot or image extraction is required in the app summary.
- When figures or tables are useful, embed a standalone text marker directly near the related explanation, such as `> 此处放图：原文 Figure 2（方法总览）...` or `> 此处放表：原文 Table 1（主结果对比）...`.
- Do not create a separate figure/table overview section.
- Do not generate a WeChat article with `pics/`.
- Keep the output compact, factual, and useful for later per-paper AI chat.

## Output Structure

Always output Markdown with exactly these major sections:

```markdown
# PaperCAT 论文精读

## 论文信息

- **论文链接：** ...
- **论文代码：** ...
- **发表时间：** ...
- **机构：** ...

## 论文看板

- **Motivation：** ...
- **要解决的问题：** ...
- **解决方案：** ...
- **核心发现：** ...
- **后续改进：** ...

## 摘要

一句话概括：
> **...**

- **问题：** ...
- **方法：** ...
- **创新：** ...
- **结果：** ...
- **意义：** ...

## 背景

...

## 方法

### 1. 核心思路
...

### 2. 关键模块
...

## 实验

- **任务/数据：** ...
- **评价指标：** ...
- **核心结果：** ...
- **需要注意：** ...

## 结论

> **...**

核心贡献：
- ...
- ...
- ...

### 后续可追问

- ...
- ...
- ...

## 猫猫短评

...
```

## Style

- Use Chinese by default, while preserving necessary English terms such as `Foundation Model`, `mIoU`, `F1`, `RMSE`, or method names.
- Prefer short paragraphs and bullets.
- Explain complex methods in the order: problem -> mechanism -> intuition -> why it helps.
- Be reader-friendly, not promotional.
- Do not overclaim. Avoid phrases like "首次", "彻底解决", or "碾压" unless the paper explicitly supports them.
- Do not fabricate datasets, metrics, gains, authors, code links, venues, or publication dates.
- If a field is unclear, say "论文中未明确说明" or use cautious wording.

## Length

Default length should be medium-short:

- `## 论文信息`: 4 bullets only. Keep each item short.
- `## 论文看板`: 5 bullets only. Use simple, direct language; each bullet should be one short sentence.
- `## 摘要`: one quote block + 4-5 bullets.
- `## 背景`: 2-3 short paragraphs or 3 pain-point bullets.
- `## 方法`: the most detailed section, but focus on 2-3 key mechanisms.
- `## 实验`: compressed; do not enumerate every table or dataset.
- `## 结论`: one quote block + 3 contribution bullets + 2-3 follow-up questions.

## Factuality Rules

- Treat the PDF text as the source of truth.
- Specific numbers must come from the PDF text.
- For `## 论文信息`, only use information explicitly available in the extracted text or metadata. If an item is missing, write "论文中未明确说明".
- `论文链接` can be a DOI, arXiv URL/ID, publisher URL, or official paper page. Do not invent a URL.
- `论文代码` should be an official GitHub/GitLab/project code URL if present. If only a project page is present, write it cautiously as the project/code page. Do not infer code links from method names.
- `发表时间` should use the paper's explicit publication date, arXiv date, conference/year, or metadata year. If only a year is available, use the year.
- `机构` should list author affiliations or clearly stated organizations. Keep it concise; if many institutions are present, list the main ones and add "等".
- `## 论文看板` should be placed immediately after `## 论文信息` and before `## 摘要`.
- In `## 论文看板`, keep the wording very concise:
  - `Motivation`: why this research is needed;
  - `要解决的问题`: the concrete bottleneck or research question;
  - `解决方案`: the proposed method in one sentence;
  - `核心发现`: the most important result or trend;
  - `后续改进`: the most natural next step, limitation, or extension.
- If any `## 论文看板` item is not supported by the text, use cautious wording instead of guessing.
- If extracted text is too short or incomplete, explicitly mention that the summary is based on limited extractable text.
- Do not invent figure or table numbers. Only cite a figure/table if the extracted text clearly contains its identifier, caption, or surrounding description.
- Do not use screenshots, local image paths, Markdown image syntax, or placeholders like `![figure](...)` in the summary.
- Do not add a standalone figure/table section.
- When a figure/table is useful for understanding a nearby paragraph, insert one standalone quote block immediately after that paragraph:
  `> 此处放图：原文 Figure 1（方法总览）展示了...，适合用来理解...`
- For tables, use:
  `> 此处放表：原文 Table 2（主结果对比）展示了...，适合用来判断...`
- Each `此处放图` / `此处放表` marker should include:
  - the original identifier, for example `Figure 1`, `Fig. 4`, or `Table 2`;
  - what the figure/table shows;
  - why it helps this specific part of the explanation.
- Use at most 3 figure/table markers in one summary. Prefer method overview, key ablation, main comparison, case study, or error analysis.
- If the extracted text does not preserve reliable figure/table captions, simply do not add these markers; do not add a generic apology section.
- Avoid direct translation of the abstract; synthesize the paper's main line.
- Keep the final `## 猫猫短评` to one concise sentence about how to read or use the paper.
