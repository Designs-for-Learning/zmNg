#!/usr/bin/env bash
# Security checks for this project. Auto-detects what applies:
#   pip-audit  - known vulnerabilities in Python requirements
#   bandit     - Python static analysis (medium+ severity)
#   npm audit  - known vulnerabilities in Node lockfiles (high+)
#   osv-scanner - known vulnerabilities in Ruby (Gemfile.lock) and Rust
#                (Cargo.lock) lockfiles and in the Maven coordinates a
#                Gradle (Android) project declares, from the OSV.dev database
#   gitleaks   - secret scan (git history, or working tree if no repo)
# Also refreshes this project's dependency inventory in the sibling
# dl-tech-digest repo so the daily digest routine can match CVEs
# against our real dependencies, transitive ones included.
# `--inventory-only` skips the scans.
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
        -not -path '*/.venv/*' -not -path '*/__pycache__/*' \
        -not -path '*/.claude/*' -not -path '*/target/*' -not -path '*/Pods/*' )

# Declared Gradle dependencies for one project root (the directory holding
# settings.gradle*), as "group:artifact version" lines: coordinates from
# every *.gradle(.kts) file with $var references resolved from ext-style
# assignments, and libs.x.y aliases resolved from gradle/libs.versions.toml.
# Declared versions only: without a gradle.lockfile the resolved transitive
# tree is unknown, and a "?" version is one a Compose BOM sets. Shared by
# the inventory below and the osv-scanner step, which feeds the same lines
# to the scanner as a synthetic lockfile.
GRADLE_PY=$(cat <<'PY'
import os, re, sys
# Declared Gradle dependencies for one project root (the dir holding
# settings.gradle*): Maven coordinates from every *.gradle(.kts) file,
# with $var / ${var} resolved from ext-style assignments and libs.x.y
# aliases resolved from gradle/libs.versions.toml. Declared versions
# only — without a gradle.lockfile the resolved transitive tree is unknown.
root = sys.argv[1]
texts, files = {}, []
for d, dirs, fs in os.walk(root):
    dirs[:] = [x for x in dirs if x not in ('build', '.gradle', 'node_modules')]
    for f in fs:
        if f.endswith(('.gradle', '.gradle.kts')) or f == 'libs.versions.toml':
            p = os.path.join(d, f); files.append(p)
            texts[p] = re.sub(r'(?m)(^|\s)//.*$', r'\1', open(p, encoding='utf-8', errors='replace').read())
norm = lambda k: re.sub(r'[-_]', '.', k)
# version catalog
versions, libs, plugins = {}, {}, {}
for p, t in texts.items():
    if not p.endswith('libs.versions.toml'): continue
    table = None
    for line in t.splitlines():
        line = line.split('#')[0].strip()
        m = re.match(r'^\[(\w+)\]', line)
        if m: table = m[1]; continue
        m = re.match(r'^([\w.-]+)\s*=\s*(.+)$', line)
        if not m: continue
        key, val = norm(m[1]), m[2]
        if table == 'versions':
            v = re.search(r'"([^"]+)"', val); versions[key] = v[1] if v else '?'
        elif table in ('libraries', 'plugins'):
            g = re.search(r'group\s*=\s*"([^"]+)"', val); n = re.search(r'name\s*=\s*"([^"]+)"', val)
            mod = re.search(r'module\s*=\s*"([^"]+)"', val); pid = re.search(r'id\s*=\s*"([^"]+)"', val)
            ref = re.search(r'version\.ref\s*=\s*"([^"]+)"', val); ver = re.search(r'version\s*=\s*"([^"]+)"', val)
            s = re.match(r'^"([^":]+):([^":]+)(?::([^"]+))?"$', val)
            coord = f"{g[1]}:{n[1]}" if g and n else mod[1] if mod else f"{s[1]}:{s[2]}" if s else pid[1] if pid else None
            version = versions.get(norm(ref[1]), '?') if ref else ver[1] if ver else s[3] if s and s[3] else ''
            if coord: (plugins if table == 'plugins' else libs)[key] = (coord, version)
# ext-style version variables, for Groovy "$name" references
vars_ = {}
for p, t in texts.items():
    if p.endswith('.toml'): continue
    for m in re.finditer(r'''(?m)^\s*(?:val\s+|def\s+|ext\.)?(\w+)\s*=\s*['"]([^'"]+)['"]''', t):
        vars_[m[1]] = m[2]
def subst(v):
    return re.sub(r'\$\{?(\w+)\}?', lambda m: vars_.get(m[1], m[0]), v)
found = {}   # (coord, version) -> set of notes
def add(coord, version, note=''):
    found.setdefault((coord, version or '?'), set()).add(note or 'main')
for p, t in texts.items():
    if p.endswith('.toml'): continue
    bom = None
    for line in t.splitlines():
        cfg = re.match(r'^\s*(\w+)\s*[\(\s]', line)
        cfg = cfg[1] if cfg else ''
        note = 'test' if re.search(r'(?i)test', cfg) else ''
        for g, a, v in re.findall(r'''["']([A-Za-z0-9_.\-]+):([A-Za-z0-9_.\-]+):([^"'\s]+)["']''', line):
            add(f"{g}:{a}", subst(v), note)
        for alias in re.findall(r'\blibs\.((?!plugins\.|versions\.)[\w.]+)', line):
            if norm(alias) in libs:
                coord, version = libs[norm(alias)]
                if 'platform(' in line: bom = f"{coord} {version}"
                add(coord, version, note if version else f"version from BOM {bom}" if bom else 'version unresolved')
        for alias in re.findall(r'\blibs\.plugins\.([\w.]+)', line):
            if norm(alias) in plugins:
                add(*plugins[norm(alias)], 'plugin')
        for pid, v in re.findall(r'''id\s*\(?\s*["']([\w.]+)["']\s*\)?\s*version\s*\(?\s*["']([^"']+)["']''', line):
            add(pid, v, 'plugin')
for (coord, version), notes in sorted(found.items()):
    if 'main' in notes:  # declared for the app itself, so a test-only declaration elsewhere does not matter
        notes -= {'main', 'test'}
    print(f"{coord} {version}" + (f"  # {', '.join(sorted(notes))}" if notes else ''))
print("(declared versions only: no gradle.lockfile, so the resolved transitive tree is not inventoried)")
PY
)

# Dependency inventory for the digest routine (see dl-tech-digest
# docs/routine-prompt.md). Direct deps are listed as declared; transitive
# deps at the exact version a fresh install resolves to today (Node, Ruby,
# Rust: the lockfile; Python: a pip dry-run against the index), each tagged
# "# via" with the packages that require it so a CVE hit traces back to
# the direct dep to bump. Resolved versions drift as upstream publishes —
# publish-inventory.yml refreshes weekly. No timestamp, so an unchanged
# tree publishes nothing. A .digest-exclude file in the project root opts
# the project out of digest coverage.
if [ -d ../dl-tech-digest ] && [ ! -f .digest-exclude ]; then
  mkdir -p ../dl-tech-digest/inventory
  {
    echo "# $(basename "$(pwd)") — dependency inventory"
    echo "Generated by security-check.sh; do not edit by hand."
    while IFS= read -r req; do
      echo; echo "## Python: $req"
      grep -vE '^[[:space:]]*(#|$|-r|--)' "$req"
      echo; echo "## Python transitive: $req"
      if have python3; then
        # --dry-run never touches site-packages, so this is safe outside a
        # venv; --ignore-installed makes the report cover the whole tree.
        python3 - "$req" <(python3 -m pip install --dry-run --ignore-installed \
          -q --report - -r "$req" 2>/dev/null) <<'PY'
import json, os, re, sys
norm = lambda n: re.sub(r'[-_.]+', '-', n).lower()
def parse(req):  # 'sqlalchemy[asyncio]>=2' -> ('sqlalchemy', {'asyncio'})
    m = re.match(r'\s*([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[([^\]]*)\])?', req)
    return norm(m[1]), {norm(e.strip()) for e in (m[2] or '').split(',') if e.strip()}
declared = {}  # name -> extras asked for; -r includes are declared too
def read(path):
    for line in open(path):
        line = line.strip()
        inc = re.match(r'(?:-r|--requirement)\s+(\S+)', line)
        if inc:
            read(os.path.join(os.path.dirname(path), inc[1]))
        elif line and line[0] not in '#-':
            name, extras = parse(line)
            declared.setdefault(name, set()).update(extras)
read(sys.argv[1])
try:
    tree = json.load(open(sys.argv[2]))['install']
except ValueError:
    print('(pip resolution failed)'); sys.exit()
versions = {norm(i['metadata']['name']): i['metadata']['version'] for i in tree}
# Who requires whom, from each package's Requires-Dist. A requirement
# gated on an extra counts only once someone asks for that extra
# (fonttools[woff] -> brotli), so extras propagate until nothing changes.
edges = []
for i in tree:
    parent = norm(i['metadata']['name'])
    for req in i['metadata'].get('requires_dist') or []:
        child, extras = parse(req)
        gate = re.search(r'''extra\s*==\s*['"]([^'"]+)''', req)
        if child in versions:
            edges.append((parent, child, extras, gate and norm(gate[1])))
via = {n: set() for n in versions}
extras = {n: set(declared.get(n, ())) for n in versions}
changed = True
while changed:
    changed = False
    for parent, child, want, gate in edges:
        if (gate is None or gate in extras[parent]) and (parent not in via[child] or not want <= extras[child]):
            via[child].add(parent); extras[child] |= want; changed = True
for name in sorted(versions):
    if name not in declared:
        parents = ', '.join(sorted(via[name]))
        print(f'{name}=={versions[name]}' + (f'  # via {parents}' if parents else ''))
PY
      else
        echo "(python3 not installed)"
      fi
    done < <(find . -name 'requirements*.txt' "${PRUNE[@]}" | sort)
    if have python3; then
      while IFS= read -r lock; do
        echo; echo "## Node: $lock"
        python3 - "$lock" <<'PY'
import json, sys
pkgs = json.load(open(sys.argv[1])).get('packages', {})
root = pkgs.get('', {})
direct = set(root.get('dependencies', {})) | set(root.get('devDependencies', {}))
# Nested copies (a/node_modules/b) collapse onto the package name; a name
# installed at several versions lists them all. via = who requires whom,
# peers included since npm installs them automatically.
versions, via = {}, {}
for path, meta in pkgs.items():
    if path:
        name = path.rsplit('node_modules/', 1)[1]
        versions.setdefault(name, set()).add(meta.get('version', '?'))
        for kind in ('dependencies', 'optionalDependencies', 'peerDependencies'):
            for child in meta.get(kind) or {}:
                via.setdefault(child, set()).add(name)
def show(names, chains=False):
    for n in sorted(names):
        line = f"{n} {', '.join(sorted(versions.get(n, {'?'})))}"
        parents = ', '.join(sorted(via.get(n, ())))
        print(line + (f'  # via {parents}' if chains and parents else ''))
show(direct)
print(); print('## Node transitive:', sys.argv[1])
show(versions.keys() - direct, chains=True)
PY
      done < <(find . -name 'package-lock.json' "${PRUNE[@]}" | sort)
      while IFS= read -r lock; do
        echo; echo "## Ruby: $lock"
        python3 - "$lock" <<'PY'
import re, sys
# GEM/GIT/PATH blocks list specs at 4 spaces with their requirements at
# 6; DEPENDENCIES lists what the Gemfile asks for directly.
specs, via, direct = {}, {}, set()
section = parent = None
for line in open(sys.argv[1]):
    if not line.startswith(' '):
        section = line.strip(); continue
    if section in ('GEM', 'GIT', 'PATH'):
        m = re.match(r'^( +)(\S+)(?: \(([^)]*)\))?', line)
        if m and len(m[1]) == 4:
            specs[m[2]] = m[3] or '?'; parent = m[2]
        elif m and len(m[1]) == 6 and parent:
            via.setdefault(m[2], set()).add(parent)
    elif section == 'DEPENDENCIES':
        m = re.match(r'^ +([^\s(!]+)', line)
        if m: direct.add(m[1])
def show(names, chains):
    for n in sorted(names):
        parents = ', '.join(sorted(via.get(n, ())))
        print(f"{n} {specs.get(n, '?')}" + (f'  # via {parents}' if chains and parents else ''))
show(direct, False)
print(); print('## Ruby transitive:', sys.argv[1])
show(specs.keys() - direct, True)
PY
      done < <(find . -name 'Gemfile.lock' "${PRUNE[@]}" | sort)
      while IFS= read -r lock; do
        echo; echo "## Rust: $lock"
        python3 - "$lock" <<'PY'
import sys
# Crates without a source line are the workspace's own; their dependency
# lists are the direct deps. Dependency entries read "name", "name 1.2.3"
# or "name 1.2.3 (source)" when several versions coexist.
pkgs, cur = [], None
for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    if line == '[[package]]': cur = {'deps': []}; pkgs.append(cur)
    elif cur is None: continue
    elif line.startswith('name = '): cur['name'] = line.split('"')[1]
    elif line.startswith('version = '): cur['version'] = line.split('"')[1]
    elif line.startswith('source = '): cur['source'] = True
    elif line.startswith(' "'): cur['deps'].append(line.split('"')[1].split(' ')[0])
local = {p['name'] for p in pkgs if 'source' not in p}
versions, via = {}, {}
for p in pkgs:
    versions.setdefault(p['name'], set()).add(p.get('version', '?'))
    for d in p['deps']: via.setdefault(d, set()).add(p['name'])
direct = {d for p in pkgs if p['name'] in local for d in p['deps']}
def show(names, chains):
    for n in sorted(names):
        parents = ', '.join(sorted(via.get(n, set()) - local))
        print(f"{n} {', '.join(sorted(versions.get(n, {'?'})))}" + (f'  # via {parents}' if chains and parents else ''))
show(direct, False)
print(); print('## Rust transitive:', sys.argv[1])
show(versions.keys() - direct - local, True)
PY
      done < <(find . -name 'Cargo.lock' "${PRUNE[@]}" | sort)
      while IFS= read -r settings; do
        echo; echo "## Gradle: $(dirname "$settings")"
        python3 -c "$GRADLE_PY" "$(dirname "$settings")"
      done < <(find . \( -name 'settings.gradle' -o -name 'settings.gradle.kts' \) "${PRUNE[@]}" | sort)
      while IFS= read -r lock; do
        echo; echo "## CocoaPods: $lock"
        python3 - "$lock" <<'PY'
import re, sys
# PODS lists every pod at 2 spaces with its requirements at 4;
# DEPENDENCIES lists what the Podfile asks for directly.
pods, via, direct = {}, {}, set()
section = parent = None
for line in open(sys.argv[1]):
    if not line.startswith(' '):
        section = line.strip().rstrip(':'); continue
    m = re.match(r'^( +)- "?([^" (]+)(?: \(([^)]*)\))?', line)
    if not m: continue
    if section == 'PODS':
        if len(m[1]) == 2: pods[m[2]] = m[3] or '?'; parent = m[2]
        elif len(m[1]) == 4 and parent: via.setdefault(m[2], set()).add(parent)
    elif section == 'DEPENDENCIES' and len(m[1]) == 2:
        direct.add(m[2])
def show(names, chains):
    for n in sorted(names):
        parents = ', '.join(sorted(via.get(n, ())))
        print(f"{n} {pods.get(n, '?')}" + (f'  # via {parents}' if chains and parents else ''))
show(direct, False)
print(); print('## CocoaPods transitive:', sys.argv[1])
show(pods.keys() - direct, True)
PY
        echo "(CocoaPods has no advisory database; the digest matches these against NVD by name only)"
      done < <(find . -name 'Podfile.lock' "${PRUNE[@]}" | sort)
    fi
  } > "../dl-tech-digest/inventory/$(basename "$(pwd)").md"
fi
[ "${1:-}" = "--inventory-only" ] && exit 0

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

# Ruby and Rust lockfiles. osv-scanner exits 1 on any advisory, including
# RUSTSEC "unmaintained" notices and lows, so judge its JSON instead and
# fail on high/critical only — the same bar as npm audit above.
osv_scan() {
  osv-scanner scan source -L "$1" --format json 2>/dev/null | python3 -c '
import json, sys
try:
    results = json.load(sys.stdin)["results"]
except (ValueError, KeyError):
    sys.exit("osv-scanner produced no result")
fail = 0
for r in results:
    for p in r.get("packages", []):
        for v in p.get("vulnerabilities", []):
            extra = [v.get("database_specific") or {}] + [a.get("database_specific") or {} for a in v.get("affected", [])]
            if any(x.get("informational") for x in extra):
                sev = "informational"
            else:
                sev = next((x["severity"].lower() for x in extra if x.get("severity")), "unknown")
                fail += sev in ("high", "critical", "unknown")
            name, ver, vid, summary = p["package"]["name"], p["package"]["version"], v["id"], v.get("summary", "")[:70]
            print(f"{sev:13} {name} {ver}  {vid}  {summary}")
sys.exit(1 if fail else 0)'
}
while IFS= read -r lock; do
  if have osv-scanner; then
    run "osv-scanner (high+): $lock" osv_scan "$lock"
  else
    skip "osv-scanner: $lock" osv-scanner
  fi
done < <(find . \( -name 'Gemfile.lock' -o -name 'Cargo.lock' \) "${PRUNE[@]}")

# Gradle projects: the declared coordinates, written as a synthetic
# gradle.lockfile so osv-scanner can look them up (plugins and
# BOM-managed "?" versions excluded).
while IFS= read -r settings; do
  proj=$(dirname "$settings")
  if have osv-scanner; then
    lock=$(mktemp -d)/gradle.lockfile
    python3 -c "$GRADLE_PY" "$proj" | python3 -c '
import re, sys
for l in sys.stdin:
    m = re.match(r"^(\S+:\S+) (\S+)(?:  # (.*))?$", l.rstrip())
    if m and m[2] != "?" and "plugin" not in (m[3] or ""): print(f"{m[1]}:{m[2]}=declared")
print("empty=")' > "$lock"
    run "osv-scanner (high+, declared versions): $proj" osv_scan "$lock"
    rm -rf "$(dirname "$lock")"
  else
    skip "osv-scanner: $proj" osv-scanner
  fi
done < <(find . \( -name 'settings.gradle' -o -name 'settings.gradle.kts' \) "${PRUNE[@]}")

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
