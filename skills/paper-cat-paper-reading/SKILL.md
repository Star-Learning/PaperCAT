---
name: paper-cat-paper-reading
description: Generate concise, factual Chinese Markdown research-paper summaries for PaperCAT desktop reading history. Use when PaperCAT summarizes a PDF into a reader-friendly academic digest rather than a long public-account article.
---

# PaperCAT 论文精读总结 Skill

## Goal

Given extracted PDF text and metadata, generate a Chinese Markdown summary that helps a researcher quickly decide what the paper does, why it matters, how it works, and what to ask next.

This skill is adapted from `C:\work\vibe-article\SKILL.md`, but scoped for PaperCAT's desktop reading history:

- No image extraction is required in the app summary.
- Do not generate a WeChat article with `pics/`.
- Keep the output compact, factual, and useful for later per-paper AI chat.

## Output Structure

Always output Markdown with exactly these major sections:

```markdown
# PaperCAT 论文精读

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

- `## 摘要`: one quote block + 4-5 bullets.
- `## 背景`: 2-3 short paragraphs or 3 pain-point bullets.
- `## 方法`: the most detailed section, but focus on 2-3 key mechanisms.
- `## 实验`: compressed; do not enumerate every table or dataset.
- `## 结论`: one quote block + 3 contribution bullets + 2-3 follow-up questions.

## Factuality Rules

- Treat the PDF text as the source of truth.
- Specific numbers must come from the PDF text.
- If extracted text is too short or incomplete, explicitly mention that the summary is based on limited extractable text.
- Avoid direct translation of the abstract; synthesize the paper's main line.
- Keep the final `## 猫猫短评` to one concise sentence about how to read or use the paper.
