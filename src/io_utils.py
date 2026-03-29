from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class FeatureRow:
    index: int
    file_name: str
    created: datetime
    created_raw: str


def read_analysis_features(path: str) -> list[FeatureRow]:
    rows: list[FeatureRow] = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            created_raw = row["created"]
            created = datetime.strptime(created_raw, "%Y-%m-%d %H:%M")
            rows.append(
                FeatureRow(
                    index=i,
                    file_name=row["file_name"],
                    created=created,
                    created_raw=created_raw,
                )
            )
    return rows


def read_temporal_rows(path: str) -> list[dict[str, str]]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def sort_features_by_date(rows: list[FeatureRow]) -> list[FeatureRow]:
    return sorted(rows, key=lambda r: r.created)


def load_markdown_body(path: str) -> str:
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    parts = text.split("---")
    if len(parts) >= 3:
        return "---".join(parts[2:]).strip()
    return text.strip()
