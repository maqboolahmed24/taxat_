from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from .runtime_profile import load_python_runtime_profile


REPO_ROOT = Path(__file__).resolve().parents[4]


def run_repo_command(*segments: str) -> int:
    return subprocess.call([sys.executable, *segments], cwd=REPO_ROOT)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args[0] == "contracts":
        return run_repo_command("Algorithm/scripts/validate_contracts.py", "--self-test")
    if args[0] == "forensic":
        return run_repo_command("Algorithm/tools/forensic_contract_guard.py")
    if args[0] == "runtime-profile":
        print(json.dumps(load_python_runtime_profile(), indent=2))
        return 0
    print("usage: python -m taxat_validators [contracts|forensic|runtime-profile]", file=sys.stderr)
    return 1
