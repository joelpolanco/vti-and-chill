#!/usr/bin/env python3
"""Remove all Community nav links from every HTML page."""
import re
from pathlib import Path

REPO = Path("/home/user/workspace/vti-repo")

# Match variants of <a href="...community.html">Community</a> (any depth)
# Uses class attribute optional
PATTERNS = [
    # Nav-style: <a href="./community.html">Community</a> or <a href="../community.html" class="active">Community</a>
    re.compile(r'<a\s+href="\.{1,2}/(?:pages/)?community\.html"[^>]*>\s*Community\s*</a>'),
    # index.html footer style: Forum / Discord / Meetups all pointing to community.html
    re.compile(r'<a\s+href="\.{1,2}/pages/community\.html"[^>]*>\s*Forum\s*</a>'),
    re.compile(r'<a\s+href="\.{1,2}/pages/community\.html"[^>]*>\s*Discord\s*</a>'),
    re.compile(r'<a\s+href="\.{1,2}/pages/community\.html"[^>]*>\s*Meetups\s*</a>'),
]

changed_files = []
for html in REPO.rglob("*.html"):
    # Skip the community.html file itself (leave it alone; we're just unlinking)
    if html.name == "community.html":
        continue
    txt = html.read_text(encoding="utf-8")
    orig = txt
    for pat in PATTERNS:
        txt = pat.sub("", txt)
    if txt != orig:
        html.write_text(txt, encoding="utf-8")
        changed_files.append(str(html.relative_to(REPO)))

print(f"Files changed: {len(changed_files)}")
for f in changed_files:
    print(f"  {f}")
