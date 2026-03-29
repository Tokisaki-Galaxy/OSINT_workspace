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
    if any(k in t for k in ["恋爱", "接吻", "初吻", "交往", "分手", "亲密"]):
        return "亲密关系"
    if any(k in t for k in ["打架", "斗殴", "冲突", "攻击", "受罚", "管教", "被动气场"]):
        return "冲突与管教"
    if any(k in t for k in ["工作", "职场", "工资", "产线", "辞职", "职业", "验厂"]):
        return "工作与生计"
    if any(k in t for k in ["漫展", "cos", "动画", "高达", "观影", "追番", "展"]):
        return "ACG与圈层"
    if any(k in t for k in ["观赛", "奥运", "体育", "训练", "集训"]):
        return "体育与训练"
    if any(k in t for k in ["家庭", "父亲", "母亲", "长辈", "葬礼", "外婆", "父母"]):
        return "家庭系统"
    if any(k in t for k in ["经济", "贫穷", "有钱", "消费", "开销", "报销", "别墅"]):
        return "经济与资源"
    if any(k in t for k in ["身高", "外貌", "自卑", "化妆", "女装", "校服", "审美"]):
        return "身份与身体认同"
    if any(k in t for k in ["观察", "观点", "反思", "认知", "阐述", "构想", "总结"]):
        return "认知与解释"
    return "其他事件"


def infer_explanation_style(descriptions: Iterable[str]) -> str:
    text = " / ".join(descriptions)
    if not text:
        return "不确定"

    if any(k in text for k in ["社会", "现实", "环境", "经济", "结构", "规则", "时代"]):
        return "结构归因：倾向将经历解释为外部环境/规则驱动。"
    if any(k in text for k in ["我认为", "我发现", "我以为", "反思", "质疑", "感到"]):
        return "反思归因：将经历转化为自我解释与认知修正。"
    if any(k in text for k in ["为了", "选择", "决定", "策略", "控制", "规避"]):
        return "策略归因：把经历解释为目标导向的应对选择。"
    if any(k in text for k in ["喜欢", "开心", "兴奋", "羞耻", "害怕", "痛苦"]):
        return "情绪归因：以情绪体验组织事件意义。"
    return "混合归因：事件叙述同时包含处境描述与个人解释。"

