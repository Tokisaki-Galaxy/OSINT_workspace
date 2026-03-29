from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path('/home/runner/work/OSINT_workspace/OSINT_workspace')
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.io_utils import load_markdown_body, read_analysis_features, sort_features_by_date
from src.window_mapper import WindowSpec, expand_window, pick_feature_rows


BASE = Path('/home/runner/work/OSINT_workspace/OSINT_workspace/美味小土豆')
ANALYSIS = BASE / 'analysis_features.csv'
EXTRACTED = BASE / 'extracted_mds'
OUT = BASE / 'breakpoint_close_reading_raw.md'

# 联合断裂点（上一步产出）
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

# 单指标峰值（去重采样）
SINGLE_METRIC = [
    WindowSpec('FP_2025-10-24', 491, 495),
    WindowSpec('FP_2026-02-02', 647, 651),
    WindowSpec('SOMATIC_2025-10-19', 467, 471),
    WindowSpec('PASSIVE_2024-07-14', 33, 37),
    WindowSpec('WORDCOUNT_2026-03-26', 770, 774),
]


def section_lines(title: str, specs: list[WindowSpec], sorted_rows):
    lines: list[str] = [f'## {title}', '']
    for spec in specs:
        expanded = expand_window(spec, 1, len(sorted_rows), radius_windows=1)
        rows = pick_feature_rows(sorted_rows, expanded)
        lines.append(f"### {spec.label} | center={expanded.center_start}-{expanded.center_end} | expanded={expanded.expanded_start}-{expanded.expanded_end}")
        lines.append('')
        for r in rows:
            md_path = EXTRACTED / r.file_name
            body = load_markdown_body(str(md_path)) if md_path.exists() else '[[MISSING FILE]]'
            first_sentence = '不确定'
            for ln in [x.strip() for x in body.splitlines() if x.strip() and not x.strip().startswith('![](')]:
                first_sentence = ln
                break
            lines.append(f"- idx={r.index} | date={r.created_raw} | file={r.file_name}")
            lines.append(f"  - quote_candidate: {first_sentence}")
        lines.append('')
    return lines


def main():
    features = read_analysis_features(str(ANALYSIS))
    sorted_rows = sort_features_by_date(features)

    lines: list[str] = ['# 断裂点原文精读（原始抽取草稿）', '']
    lines += section_lines('联合断裂点', AGG_BREAKPOINTS, sorted_rows)
    lines += section_lines('单指标峰值', SINGLE_METRIC, sorted_rows)

    OUT.write_text('\n'.join(lines), encoding='utf-8')
    print(f'written: {OUT}')


if __name__ == '__main__':
    main()
