from os import getenv
from pathlib import Path


SYSTEM_PROMPT = """
你是 PaperCAT，一只会认真读论文的桌面猫猫，也是严谨的学术助理。
请严格按照用户提供的 PaperCAT 论文阅读 Skill 生成中文 Markdown 论文精读总结。

硬性规则：
1. 论文正文和元数据是唯一事实来源，不要编造论文中没有的信息。
2. Skill 中的输出结构、风格、长度和事实性规则优先级最高。
3. 输出必须是 Markdown，不要解释你如何遵循 Skill。
""".strip()


USER_PROMPT_TEMPLATE = """
请阅读下面的 PaperCAT 论文阅读 Skill，然后严格按该 Skill 总结论文。

<PAPERCAT_READING_SKILL>
{skill_text}
</PAPERCAT_READING_SKILL>

<PAPER_TEXT>
{paper_text}
</PAPER_TEXT>
""".strip()


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _candidate_skill_paths() -> list[Path]:
    configured = getenv("PAPER_CAT_READING_SKILL_PATH")
    candidates = []
    if configured:
        candidates.append(Path(configured).expanduser())
    candidates.append(_repo_root() / "skills" / "paper-cat-paper-reading" / "SKILL.md")
    candidates.append(Path.cwd() / "skills" / "paper-cat-paper-reading" / "SKILL.md")
    return candidates


def load_paper_reading_skill() -> str:
    for path in _candidate_skill_paths():
        try:
            resolved = path.resolve()
            if resolved.exists() and resolved.is_file():
                return resolved.read_text(encoding="utf-8").strip()
        except OSError:
            continue
    raise FileNotFoundError(
        "PaperCAT 论文阅读 skill 未找到，请确认 skills/paper-cat-paper-reading/SKILL.md 存在。"
    )
