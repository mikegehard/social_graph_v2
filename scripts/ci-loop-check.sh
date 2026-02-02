#!/bin/bash
# CI loop check: test-container only at this stage
# Inner-loop checks and tests are added by /add-inner-loop
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Testing container build..."
"$REPO_ROOT/project-container/test-container.sh"

echo "CI checks passed."
