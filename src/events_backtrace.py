from __future__ import annotations

import csv
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class EventRow:
    file_name: str
    period: str
    event_type: str
    description: str


EVENT_TYPE_GROUPS: list[tuple[str, tuple[str, ...]]] = [
    ("亲密关系", ("恋爱", "接吻", "初吻", "交往", "分手", "亲密")),
    ("冲突与管教", ("打架", "斗殴", "冲突", "攻击", "受罚", "管教", "被动气场")),
    ("工作与生计", ("工作", "职场", "工资", "产线", "辞职", "职业", "验厂")),
    ("ACG与圈层", ("漫展", "cos", "动画", "高达", "观影", "追番", "展")),
    ("体育与训练", ("观赛", "奥运", "体育", "训练", "集训")),
    ("家庭系统", ("家庭", "父亲", "母亲", "长辈", "葬礼", "外婆", "父母")),
    ("经济与资源", ("经济", "贫穷", "有钱", "消费", "开销", "报销", "别墅")),
    ("身份与身体认同", ("身高", "外貌", "自卑", "化妆", "女装", "校服", "审美")),
    ("认知与解释", ("观察", "观点", "反思", "认知", "阐述", "构想", "总结")),
]

STRUCTURE_KW = ("社会", "现实", "环境", "经济", "结构", "规则", "时代")
REFLECT_KW = ("我认为", "我发现", "我以为", "反思", "质疑", "感到")
STRATEGY_KW = ("为了", "选择", "决定", "策略", "控制", "规避")
EMOTION_KW = ("喜欢", "开心", "兴奋", "羞耻", "害怕", "痛苦")


def read_events_raw(path: str) -> list[EventRow]:
    rows: list[EventRow] = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(
                EventRow(
                    file_name=row["file_name"],
                    period=row["period"].strip(),
                    event_type=row["event_type"].strip(),
                    description=row["description"].strip(),
                )
            )
    return rows


def normalize_event_type(event_type: str) -> str:
    t = event_type.strip()
    for category, keywords in EVENT_TYPE_GROUPS:
        if any(k in t for k in keywords):
            return category
    return "其他事件"


def infer_explanation_style(descriptions: Iterable[str]) -> str:
    found: set[str] = set()

    for desc in descriptions:
        if not desc:
            continue
        found.add("any")
        if "structure" not in found and any(k in desc for k in STRUCTURE_KW):
            found.add("structure")
        if "reflect" not in found and any(k in desc for k in REFLECT_KW):
            found.add("reflect")
        if "strategy" not in found and any(k in desc for k in STRATEGY_KW):
            found.add("strategy")
        if "emotion" not in found and any(k in desc for k in EMOTION_KW):
            found.add("emotion")
    if "any" not in found:
        return "不确定"
    if "structure" in found:
        return "结构归因：倾向将经历解释为外部环境/规则驱动。"
    if "reflect" in found:
        return "反思归因：将经历转化为自我解释与认知修正。"
    if "strategy" in found:
        return "策略归因：把经历解释为目标导向的应对选择。"
    if "emotion" in found:
        return "情绪归因：以情绪体验组织事件意义。"
    return "混合归因：事件叙述同时包含处境描述与个人解释。"
