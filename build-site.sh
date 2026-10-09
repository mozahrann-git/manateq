#!/usr/bin/env bash
# بيجهّز _site: الموقع العام بس. الإدارة عمرها ما تدخل هنا.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf _site && mkdir -p _site
cp -r assets _site/
for f in *.html; do
  case "$f" in admin*) continue;; esac
  cp "$f" _site/
done
if ls _site/admin* >/dev/null 2>&1; then echo "✗ صفحة إدارة اتسرّبت"; exit 1; fi
echo "✓ _site جاهز:"; ls _site/*.html | xargs -n1 basename
