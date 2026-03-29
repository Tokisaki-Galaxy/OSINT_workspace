from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path('/home/runner/work/OSINT_workspace/OSINT_workspace')
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.events_backtrace import infer_explanation_style, normalize_event_type, read_events_raw

BASE = ROOT / '美味小土豆'
EVENTS_RAW = BASE / 'events_raw.csv'
OUT_DIR = BASE / 'advance_analyse'
OUT_TABLE = OUT_DIR / 'breakpoint_period_event_pivot.md'

PERIOD_ALIAS = {
    '小时候': '童年',
    '小学四年级': '小学',
    '小学三年级': '小学',
    '小学五年级至初一': '小学',
    '小学初中': '小学-初中',
    '小学至初中': '小学-初中',
    '童年至初中': '童年-初中',
    '初中时期': '初中',
    '中学': '初中-高中',
    '高一': '高中',
    '高二': '高中',
    '高中时期': '高中',
    '高中暑假': '高中',
    '初中至高中': '初中-高中',
    '十六岁': '青少年',
    '十六七岁': '青少年',
    '十七岁起': '青少年',
    '17 岁': '青少年',
    '17 岁后': '青年早期',
    '18 岁起': '青年早期',
    '19 岁': '青年早期',
    '19 岁至 24 岁': '青年早期',
    '二十岁之前': '青年早期',
    '22 岁之前': '青年早期',
    '24 岁': '青年早期',
    '二十三岁': '青年早期',
    '二十六岁前': '青年中期',
    '二十八岁': '青年中期',
    '大学毕业后': '工作后',
    '职业经历': '工作后',
    '辞职初期': '工作后',
    '二十岁以后': '工作后',
    '今年': '近期',
    '去年': '近期',
    '近期': '近期',
    '日常': '近期',
    '日常社交': '近期',
    '过去时光': '不明',
    '不明时期': '不明',
    '2010 年左右': '不明',
    '2015 年': '不明',
    '2015 年后': '不明',
    '十年前': '不明',
    '二十年前': '不明',
    '十年前至二十年前': '不明',
    '广州漫展': '不明',
    '广州成都': '不明',
    '漫展经历': '不明',
    '漫展偶遇': '不明',
}

BREAKPOINT_PERIODS = ['童年', '小学', '初中', '高中', '大学', '青年早期', '工作后', '近期']
MAX_DESCRIPTIONS_PER_SAMPLE = 2


def canonical_period(period: str) -> str:
    p = period.strip()
    if p in PERIOD_ALIAS:
        return PERIOD_ALIAS[p]
    if p in BREAKPOINT_PERIODS:
        return p
    return '不明'


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = read_events_raw(str(EVENTS_RAW))

    grouped: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in rows:
        p = canonical_period(row.period)
        if p == '不明':
            continue
        e = normalize_event_type(row.event_type)
        grouped[(p, e)].append(row.description)

    period_map: dict[str, list[tuple[str, list[str]]]] = defaultdict(list)
    for (p, e), ds in grouped.items():
        period_map[p].append((e, ds))

    lines = [
        '# 步骤3：同期事件回溯（events.csv）',
        '',
        '## 方法说明',
        '- 对 `events_raw.csv` 的 `event_type` 做同义归并。',
        '- 按断裂点时期聚合事件，并统计时期内高频事件类别。',
        '- 将同一 `(period, event_type)` 描述片段合并，归纳“经历—解释方式”。',
        '',
        '## 断裂点时期 × 事件类别透视表（Top5）',
        '',
        '| 断裂点时期 | 事件类别 | 频次 | 代表经历片段（聚合） | 解释方式归纳 |',
        '| --- | --- | ---: | --- | --- |',
    ]

    for p in BREAKPOINT_PERIODS:
        items = period_map.get(p, [])
        items_sorted = sorted(items, key=lambda x: len(x[1]), reverse=True)[:5]
        for e, ds in items_sorted:
            sample = '；'.join(ds[:MAX_DESCRIPTIONS_PER_SAMPLE]) if ds else '不确定'
            style = infer_explanation_style(ds)
            lines.append(f'| {p} | {e} | {len(ds)} | {sample} | {style} |')
        if not items_sorted:
            lines.append(f'| {p} | 无有效事件 | 0 | 不确定 | 不确定 |')

    lines += [
        '',
        '## 理论依据对照',
        '- 生活事件理论（Life Events Theory）：通过具体事件类别回溯断裂点时期，避免仅靠指标做投射解释。',
        '- 叙事心理学（Narrative Psychology）：比较同类事件在不同时期的解释方式变化，观察自我认同重构路径。',
        '',
    ]

    OUT_TABLE.write_text('\n'.join(lines), encoding='utf-8')
    print(f'written: {OUT_TABLE}')


if __name__ == '__main__':
    main()
