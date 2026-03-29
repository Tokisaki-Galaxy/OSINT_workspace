from __future__ import annotations

from dataclasses import dataclass

from .io_utils import FeatureRow


@dataclass(frozen=True)
class WindowSpec:
    label: str
    window_start: int
    window_end: int


@dataclass(frozen=True)
class WindowExpanded:
    label: str
    center_start: int
    center_end: int
    expanded_start: int
    expanded_end: int


def expand_window(spec: WindowSpec, min_idx: int, max_idx: int, radius_windows: int = 1) -> WindowExpanded:
    expanded_start = max(min_idx, spec.window_start - radius_windows)
    expanded_end = min(max_idx, spec.window_end + radius_windows)
    return WindowExpanded(
        label=spec.label,
        center_start=spec.window_start,
        center_end=spec.window_end,
        expanded_start=expanded_start,
        expanded_end=expanded_end,
    )


def pick_feature_rows(sorted_rows: list[FeatureRow], expanded: WindowExpanded) -> list[FeatureRow]:
    selected = []
    for i in range(expanded.expanded_start, expanded.expanded_end + 1):
        selected.append(sorted_rows[i - 1])
    return selected
