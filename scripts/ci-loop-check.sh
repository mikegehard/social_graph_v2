#!/bin/bash
# CI loop check: test-container + inner-loop checks
set -e

show_help() {
    cat <<EOF
Usage: $(basename "$0")

Runs all CI checks: container build test + inner-loop checks.
Execute in CI or before pushing to verify full pipeline.

Exit codes:
  0  All checks passed
  1  One or more checks failed
EOF
}

[[ "${1:-}" == "--help" || "${1:-}" == "-h" ]] && { show_help; exit 0; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Testing container build..."
"$REPO_ROOT/project-container/test-container.sh"

echo "Running inner loop checks..."
"$SCRIPT_DIR/inner-loop-check.sh"

echo "CI checks passed."
