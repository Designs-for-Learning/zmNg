#!/usr/bin/env bash
# Security checks for this project. Auto-detects what applies:
#   pip-audit  - known vulnerabilities in Python requirements
#   bandit     - Python static analysis (medium+ severity)
#   npm audit  - known vulnerabilities in Node lockfiles (high+)
#   gitleaks   - secret scan (git history, or working tree if no repo)
# Exits non-zero if any check reports issues. Identical copy in every
# project; auto-detection keeps it stack-agnostic.
set -u
cd "$(dirname "$0")"

FAIL=0
run() {
  local label=$1; shift
  echo "== $label"
  if "$@"; then echo "-- OK"; else FAIL=1; echo "-- ISSUES FOUND"; fi
  echo
}
have() { command -v "$1" >/dev/null 2>&1; }
skip() { echo "== $1"; echo "-- SKIPPED ($2 not installed)"; echo; }

PRUNE=( -not -path '*/node_modules/*' -not -path '*/venv/*' \
        -not -path '*/.venv/*' -not -path '*/__pycache__/*' )

# Python dependency audit
while IFS= read -r req; do
  if have pip-audit; then
    run "pip-audit: $req" pip-audit -r "$req"
  else
    skip "pip-audit: $req" pip-audit
  fi
done < <(find . -name 'requirements*.txt' "${PRUNE[@]}")

# Python static analysis
if find . -name '*.py' "${PRUNE[@]}" | grep -q .; then
  if have bandit; then
    run "bandit (medium+ severity)" bandit -q -r . -ll \
      -x '*/venv/*,*/.venv/*,*/node_modules/*,*/__pycache__/*,*/migrations/*'
  else
    skip "bandit" bandit
  fi
fi

# Node dependency audit (npm audit needs a lockfile)
while IFS= read -r pkg; do
  dir=$(dirname "$pkg")
  if [ ! -f "$dir/package-lock.json" ]; then
    echo "== npm audit: $dir"
    echo "-- SKIPPED (no package-lock.json; run 'npm i --package-lock-only' there)"
    echo
  elif have npm; then
    run "npm audit: $dir" npm audit --prefix "$dir" --audit-level=high
  else
    skip "npm audit: $dir" npm
  fi
done < <(find . -name 'package.json' "${PRUNE[@]}")

# Secret scan
if have gitleaks; then
  if [ -d .git ]; then
    run "gitleaks (git history)" gitleaks git --no-banner --redact -v --exit-code 1 .
  else
    run "gitleaks (working tree)" gitleaks dir --no-banner --redact -v --exit-code 1 .
  fi
else
  skip "gitleaks" gitleaks
fi

exit $FAIL
