from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path('/home/runner/work/OSINT_workspace/OSINT_workspace')
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.close_reading import build_card, pick_quote, summarize_shift
from src.io_utils import load_markdown_body, read_analysis_features, sort_features_by_date
from src.window_mapper import WindowSpec, expand_window, pick_feature_rows

BASE = ROOT / '美味小土豆'
ANALYSIS = BASE / 'analysis_features.csv'
EXTRACTED = BASE / 'extracted_mds'
OUT = BASE / 'breakpoint_close_reading.md'

AGG_BREAKPOINTS = [
    WindowSpec('BP01_2025-10-21', 477, 481),
    WindowSpec('BP02_2025-09-10', 357, 361),
    WindowSpec('BP03_2026-03-23', 759, 763),
    WindowSpec('BP04_2024-07-04', 15, 19),
    WindowSpec('BP05_2026-01-09', 636, 640),
    WindowSpec('BP06_2024-08-27', 103, 107),
    WindowSpec('BP07_2025-11-20', 538, 542),
    WindowSpec('BP08_2025-12-02', 567, 571),
    WindowSpec('BP09_2025-11-24', 553, 557),
    WindowSpec('BP10_2025-09-01', 317, 321),
    WindowSpec('BP11_2025-08-09', 191, 195),
    WindowSpec('BP12_2026-03-26', 770, 774),
]

SINGLE_METRIC = [
    WindowSpec('FP_2025-10-24', 491, 495),
    WindowSpec('FP_2026-02-02', 647, 651),
    WindowSpec('SOMATIC_2025-10-19', 467, 471),
    WindowSpec('PASSIVE_2024-07-14', 33, 37),
    WindowSpec('WORDCOUNT_2026-03-26', 770, 774),
]


def render_block(specs: list[WindowSpec], sorted_rows, heading: str) -> list[str]:
    lines = [f'## {heading}', '']
    for spec in specs:
        expanded = expand_window(spec, 1, len(sorted_rows), radius_windows=1)
        rows = pick_feature_rows(sorted_rows, expanded)
        center_mid = (expanded.center_start + expanded.center_end) // 2

        lines.append(f"### {spec.label}")
        lines.append(f"窗口：center={expanded.center_start}-{expanded.center_end}，expanded={expanded.expanded_start}-{expanded.expanded_end}")
        lines.append('')

        cards = []
        for r in rows:
            body = load_markdown_body(str(EXTRACTED / r.file_name))
            quote = pick_quote(body)
            card = build_card(r.created_raw, quote)
            cards.append((r, card))

            lines.append(f"- file_name: {r.file_name}")
            lines.append(f"  - 回答日期：{card.answer_date}")
            lines.append(f"  - 原文关键段落（至少一句原话）：{card.quote}")
            lines.append(f"  - 语气：{card.tone}")
            lines.append(f"  - 归因方式：{card.attribution}")
            lines.append(f"  - 自我描述方式：{card.self_role}")
            lines.append(f"  - 是否出现防御机制：{card.defense}")

        split_at = 0
        for i, (r, _) in enumerate(cards):
            if r.index >= center_mid:
                split_at = i
                break
        if split_at == 0:
            split_at = len(cards) // 2

        summary = summarize_shift([c for _, c in cards], split_at)
        pre_q = cards[max(0, split_at - 1)][1].quote if cards else '不确定'
        post_q = cards[min(len(cards) - 1, split_at)][1].quote if cards else '不确定'

        lines.append('')
        lines.append('变化摘要：')
        lines.append(summary)
        lines.append('原文证据：')
        lines.append(f"- 前段证据：{pre_q}")
        lines.append(f"- 后段证据：{post_q}")
        lines.append('')
    return lines


def main():
    features = read_analysis_features(str(ANALYSIS))
    sorted_rows = sort_features_by_date(features)

    lines = ['# 断裂点原文精读卡片', '']
    lines += render_block(AGG_BREAKPOINTS, sorted_rows, '联合断裂点')
    lines += render_block(SINGLE_METRIC, sorted_rows, '单指标峰值')

    OUT.write_text('\n'.join(lines), encoding='utf-8')
    print(f'written: {OUT}')


if __name__ == '__main__':
    main()
