#!/usr/bin/env bash
set -euo pipefail

# Show help if --help flag is provided
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  cat << EOF
Usage: test-container.sh

Description: Test the project container build and functionality

Arguments:
  None

Examples:
  ./test-container.sh

Exit codes:
  0    All tests passed
  1    One or more tests failed

EOF
  exit 0
fi

cd "$(dirname "$0")"

echo "Building container with test tag..."
docker build --no-cache -t project-container:test .
echo

echo "Testing installed programs in container..."
echo

# Track failures
failed_tests=()

# Test function - runs binary in container
test_binary() {
  local binary=$1
  local version_flag=${2:---version}

  echo -n "Testing $binary... "

  # Run command and capture output
  if output=$(docker run --rm project-container:test "$binary" $version_flag 2>&1); then
    echo "✓"
  else
    exit_code=$?
    echo "✗ (exit code: $exit_code)"
    echo "  Command: docker run --rm project-container:test $binary $version_flag"
    echo "  Output: $output"
    echo
    failed_tests+=("$binary")
  fi
}

# Test all installed programs
test_binary "node" "--version"
test_binary "npm" "--version"
test_binary "tsc" "--version"
test_binary "eslint" "--version"
test_binary "curl" "--version"
test_binary "git" "--version"
test_binary "jq" "--version"

echo
if [ ${#failed_tests[@]} -eq 0 ]; then
  echo "All tests passed!"
  exit 0
else
  echo "Failed tests: ${failed_tests[*]}"
  exit 1
fi
