#!/usr/bin/env python
"""Run all promptfoo suites (CI gate, mock provider, no API keys)."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SUITES = sorted((BACKEND_ROOT / "promptfoo" / "suites").glob("*.yaml"))


def _promptfoo_bin() -> str:
    local = BACKEND_ROOT / "node_modules" / ".bin" / "promptfoo"
    if sys.platform == "win32":
        win = local.with_suffix(".cmd")
        if win.is_file():
            return str(win)
    if local.is_file():
        return str(local)
    found = shutil.which("promptfoo")
    if found:
        return found
    raise FileNotFoundError("promptfoo not found — run npm install in backend/")


def main() -> int:
    if not SUITES:
        print("No promptfoo suites found", file=sys.stderr)
        return 1
    for suite in SUITES:
        print(f"\n==> promptfoo {suite.name}")
        promptfoo_bin = _promptfoo_bin()
        cmd = [promptfoo_bin, "eval", "-c", str(suite)]
        result = subprocess.run(cmd, cwd=BACKEND_ROOT, check=False)
        if result.returncode != 0:
            return result.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
