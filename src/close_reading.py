from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

ANGRY_KW = ["滚", "恶心", "噩梦", "崩溃", "狂怒", "谩骂", "欺负", "快跑", "假"]
DEFENSIVE_TONE_KW = ["其实", "本质", "逻辑", "悖论", "结论", "意味着", "毋庸置疑", "反直觉"]
REFLECT_KW = ["以前", "曾经", "我以为", "后来", "感觉", "我现在"]
HELPLESS_KW = ["伤心", "无奈", "只能", "不得不", "没办法"]

INNER_ATTR_KW = ["我", "自己"]
OUTER_ATTR_KW = ["他", "她", "他们", "男人", "女人", "社会", "老板", "外卖员", "别人", "你们"]

PASSIVE_ROLE_KW = ["被", "拉黑", "伤心", "欺负", "崩溃", "讨厌", "不如"]
ACTIVE_ROLE_KW = ["我会", "我能", "我就", "我现在", "我以前", "我曾经", "我给", "我做"]

DENIAL_KW = ["不会", "不是", "不可能", "毋庸置疑"]
PROJECTION_KW = ["男人都", "女人都", "他们就是", "她们就是", "就是没被爱过", "就是会"]
INTELLECTUALIZATION_KW = ["本质", "逻辑", "悖论", "意味着", "如果", "除非", "反直觉", "结论"]


@dataclass(frozen=True)
class ReadingCard:
    answer_date: str
    quote: str
    tone: str
    attribution: str
    self_role: str
    defense: str


def pick_quote(body: str) -> str:
    lines = [x.strip() for x in body.splitlines() if x.strip()]
    for ln in lines:
        if ln.startswith('![]('):
            continue
        return ln
    return '不确定'


def detect_tone(quote: str) -> str:
    if quote == '不确定':
        return '不确定'

    tags: list[str] = []
    if any(k in quote for k in ANGRY_KW):
        tags.append('愤怒')
    if any(k in quote for k in HELPLESS_KW):
        tags.append('无奈')
    if any(k in quote for k in DEFENSIVE_TONE_KW):
        tags.append('自我辩护')
    if any(k in quote for k in REFLECT_KW):
        tags.append('反思')

    if not tags:
        if '？' in quote or '?' in quote:
            return '试探'
        return '陈述'
    return '/'.join(tags[:3])


def detect_attribution(quote: str) -> str:
    if quote == '不确定':
        return '不确定'
    has_inner = any(k in quote for k in INNER_ATTR_KW)
    has_outer = any(k in quote for k in OUTER_ATTR_KW)
    if has_inner and has_outer:
        return '混合'
    if has_inner:
        return '内归因'
    if has_outer:
        return '外归因'
    return '回避'


def detect_self_role(quote: str) -> str:
    if quote == '不确定':
        return '不确定'
    if '我' not in quote:
        return '观察者'
    if any(k in quote for k in PASSIVE_ROLE_KW):
        return '承受者'
    if any(k in quote for k in ACTIVE_ROLE_KW):
        return '主动者'
    return '观察者'


def detect_defense(quote: str) -> str:
    if quote == '不确定':
        return '不确定'

    if any(k in quote for k in PROJECTION_KW):
        return '投射'
    if any(k in quote for k in INTELLECTUALIZATION_KW):
        return '理智化'
    if any(k in quote for k in DENIAL_KW):
        return '否认'
    return '无'


def build_card(answer_date: str, quote: str) -> ReadingCard:
    return ReadingCard(
        answer_date=answer_date,
        quote=quote,
        tone=detect_tone(quote),
        attribution=detect_attribution(quote),
        self_role=detect_self_role(quote),
        defense=detect_defense(quote),
    )


def summarize_shift(cards: list[ReadingCard], split_at: int) -> str:
    if not cards:
        return '不确定（无可用样本）'
    pre = cards[:split_at]
    post = cards[split_at:]
    if not pre or not post:
        return '不确定（前后样本不足）'

    def top(items: Iterable[str]) -> tuple[str, int]:
        cnt: dict[str, int] = {}
        for x in items:
            cnt[x] = cnt.get(x, 0) + 1
        key = max(cnt, key=lambda x: cnt[x])
        return key, cnt[key]

    pre_t, pre_tn = top(c.tone for c in pre)
    post_t, post_tn = top(c.tone for c in post)
    pre_a, pre_an = top(c.attribution for c in pre)
    post_a, post_an = top(c.attribution for c in post)
    pre_r, pre_rn = top(c.self_role for c in pre)
    post_r, post_rn = top(c.self_role for c in post)
    pre_d, pre_dn = top(c.defense for c in pre)
    post_d, post_dn = top(c.defense for c in post)

    return (
        f"语气由{pre_t}({pre_tn})到{post_t}({post_tn})；"
        f"归因由{pre_a}({pre_an})到{post_a}({post_an})；"
        f"自我描述由{pre_r}({pre_rn})到{post_r}({post_rn})；"
        f"防御机制由{pre_d}({pre_dn})到{post_d}({post_dn})。"
    )
