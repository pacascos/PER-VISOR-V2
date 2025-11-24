#!/usr/bin/env python3
"""
Genera los scripts públicos sql/01_schema.sql y sql/02_seed_public_data.sql
a partir del backup más reciente guardado en backups/per_db_backup_*.sql.gz.
"""

from __future__ import annotations

import gzip
import re
from pathlib import Path
from typing import Iterable, List

ROOT = Path(__file__).resolve().parent.parent
BACKUP_DIR = ROOT / "backups"
SQL_DIR = ROOT / "sql"

# Ajusta esta lista si quieres excluir más tablas sensibles
EXCLUDED_TABLES = {"public.users"}
EXCLUDED_SEQUENCES = {"public.users_id_seq"}


def find_latest_backup() -> Path:
    candidates = sorted(
        BACKUP_DIR.glob("per_db_backup_*.sql.gz"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise FileNotFoundError(
            "No se encontró ningún backup per_db_backup_*.sql.gz en /backups"
        )
    return candidates[0]


def load_backup_lines(path: Path) -> List[str]:
    compressed = path.read_bytes()
    text = gzip.decompress(compressed).decode("utf-8")
    return text.splitlines(keepends=True)


def write_schema(lines: Iterable[str], target: Path) -> None:
    output: List[str] = []
    in_copy = False

    for line in lines:
        if line.startswith("COPY "):
            in_copy = True
            continue
        if in_copy:
            if line.strip() == r"\.":
                in_copy = False
            continue
        if line.startswith("SELECT pg_catalog.setval("):
            continue
        output.append(line)

    target.write_text("".join(output), encoding="utf-8")


COPY_RE = re.compile(r"^COPY\s+(\S+)\s", re.IGNORECASE)


def write_public_seed(lines: Iterable[str], target: Path) -> None:
    header = (
        "-- 📦 Seed público generado automáticamente\n"
        "-- No incluye tablas sensibles definidas en EXCLUDED_TABLES.\n"
        "SET statement_timeout = 0;\n"
        "SET lock_timeout = 0;\n"
        "SET client_encoding = 'UTF8';\n"
        "SET standard_conforming_strings = on;\n"
        "SET check_function_bodies = false;\n"
        "SET client_min_messages = warning;\n"
        "SET search_path = public, pg_catalog;\n\n"
    )

    output: List[str] = [header]
    inside_copy = False
    copy_allowed = False
    pending_comment = ""

    for line in lines:
        if line.startswith("-- Data for Name: "):
            pending_comment = line
            continue

        match = COPY_RE.match(line)
        if match:
            inside_copy = True
            table = match.group(1)
            copy_allowed = table not in EXCLUDED_TABLES
            if copy_allowed:
                if pending_comment:
                    output.append(pending_comment)
                output.append(line)
            pending_comment = ""
            continue

        if inside_copy:
            if line.strip() == r"\.":
                if copy_allowed:
                    output.append(line)
                    output.append("\n")
                inside_copy = False
                copy_allowed = False
                continue
            if copy_allowed:
                output.append(line)
            continue

        if line.startswith("SELECT pg_catalog.setval("):
            if any(seq in line for seq in EXCLUDED_SEQUENCES):
                continue
            output.append(line)

    target.write_text("".join(output), encoding="utf-8")


def main() -> None:
    SQL_DIR.mkdir(parents=True, exist_ok=True)
    latest = find_latest_backup()
    lines = load_backup_lines(latest)

    write_schema(lines, SQL_DIR / "01_schema.sql")
    write_public_seed(lines, SQL_DIR / "02_seed_public_data.sql")

    print(f"✅ SQL públicos regenerados desde {latest.name}")


if __name__ == "__main__":
    main()

