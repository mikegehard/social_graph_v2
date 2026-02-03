#!/bin/bash
# Inner loop check: type check + lint
# Run before committing to verify code quality.

set -e

show_help() {
    cat <<EOF
Usage: $(basename "$0")

Runs type checking and linting for the implementation loop.
Execute before committing to verify code quality.

Exit codes:
  0  All checks passed
  1  One or more checks failed
EOF
}

[[ "${1:-}" == "--help" || "${1:-}" == "-h" ]] && { show_help; exit 0; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "Installing dependencies..."
npm ci

echo "Running type check..."
npm run check

echo "Running lint..."
npm run lint

echo "Inner loop checks passed."
exit 0
