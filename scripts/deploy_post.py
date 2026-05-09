#!/usr/bin/env python3
"""Deploy a pre-built blog post: update hub, sitemap, llms.txt, SKILL.md, webmcp.js, commit+push, verify, IndexNow.

Usage: python3 deploy_post.py <slug>

The post HTML is expected to already exist at pages/blog/<slug>.html.
Metadata for each known slug is hard-coded in POSTS below.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

POSTS = {
    # =========================================================================
    "just-make-more-money-trap": {
        "date_iso": "2026-05-11",
        "date_human": "May 11, 2026",
        "section": "Anti-Guru Reality Check",
        "read_time": "8 min read",
        "title_short": "The 'Just Make More Money' Guy Is Selling You a Lottery Ticket",
        "card_title": "The 'Just Make More Money' Guy Is Selling You a Lottery Ticket",
        "card_blurb": "The viral bell-curve meme is half right. Income matters. But retail options have an 80%+ loss rate \u2014 and people selling \"systems\" for $497 are running a lottery, not a strategy.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #e74c3c 100%)",
        "card_emoji": "\U0001F3B0",
        "sitemap_priority": "0.85",
        "llms_entry": "**The 'Just Make More Money' Guy Is Selling You a Lottery Ticket**: https://www.vtiandchill.com/pages/blog/just-make-more-money-trap.html \u2014 Anti-guru takedown of a viral LinkedIn options-coach post; what the bell-curve meme gets right (savings rate matters), what it gets wrong (Barber-Odean retail options loss rates above 80%, Beason \u0026 Schreindorfer 0DTE retail losses of $241K-$350K per day); years-to-FI by savings rate; comparison of finfluencer course economics to U.S. commercial casinos (492 of them); FTC scam patterns",
        "skill_md_entry": "**The 'Just Make More Money' Guy Is Selling You a Lottery Ticket**: https://www.vtiandchill.com/pages/blog/just-make-more-money-trap.html \u2014 The viral bell-curve meme is half right (income/savings rate matters) and half a sales pitch (retail options have an 80%+ loss rate per Barber/Odean; retail 0DTE traders lost $241K-$350K per day per Beason \u0026 Schreindorfer); the 'sells courses' tell that exposes get-rich-quick scams; casino comparison",
        "webmcp_entry": "{ title: 'The \\'Just Make More Money\\' Guy Is Selling You a Lottery Ticket', url: '/pages/blog/just-make-more-money-trap.html', tags: ['options trading scams', 'retail options statistics', 'Barber Odean', 'finfluencer scams', 'bell curve meme', '0DTE losses', 'savings rate FI', 'get rich quick courses', 'Mr Money Mustache', 'casino comparison'], description: 'A viral LinkedIn options coach mocked indexers with the bell-curve meme. We break down what is true (savings rate matters), what is false (retail options loss rates above 80%), and the sells-courses tell that exposes the entire get-rich-quick playbook.' },",
    },
    # =========================================================================
    "one-fund-vti-case": {
        "date_iso": "2026-05-11",
        "date_human": "May 11, 2026",
        "section": "Portfolio Construction",
        "read_time": "5 min read",
        "title_short": "One Fund to Rule Them All: The Case for VTI",
        "card_title": "One Fund to Rule Them All: The Case for VTI",
        "card_blurb": "3,600+ companies, a 0.03% expense ratio, self-cleansing cap weighting. The only ticker most investors ever need.",
        "card_gradient": "linear-gradient(135deg, #0f3460 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F4C8",
        "sitemap_priority": "0.85",
        "llms_entry": "**One Fund to Rule Them All: The Case for VTI**: https://www.vtiandchill.com/pages/blog/one-fund-vti-case.html \u2014 Why a single fund \u2014 Vanguard\u2019s Total Stock Market ETF (VTI) \u2014 is enough for most investors: 3,600+ companies, 0.03% expense ratio, self-cleansing cap weighting that automatically reduces failing companies, ~14.3% 10-year annualized return through 2025 (Morningstar), and SPIVA showing roughly 90% of active managers underperform over 15 years",
        "skill_md_entry": "**One Fund to Rule Them All: The Case for VTI**: https://www.vtiandchill.com/pages/blog/one-fund-vti-case.html \u2014 The complete one-fund portfolio case: VTI's 3,600+ holdings, 0.03% expense ratio, cap-weighted self-cleansing structure, VTI vs VOO breakdown, behavioral arguments for simplicity, JL Collins / Bogle / SPIVA evidence",
        "webmcp_entry": "{ title: 'One Fund to Rule Them All: The Case for VTI', url: '/pages/blog/one-fund-vti-case.html', tags: ['VTI', 'Vanguard Total Stock Market', 'one fund portfolio', 'VTI vs VOO', 'expense ratio', 'CRSP US Total Market Index', 'cap weighting', 'self-cleansing index', 'simple path to wealth'], description: 'Why a single fund \u2014 VTI \u2014 beats roughly 90% of professionally managed portfolios over 15+ years. 3,600 companies, 0.03% fee, zero decisions required.' },",
    },
    # =========================================================================
    "good-better-best-portfolios": {
        "date_iso": "2026-05-13",
        "date_human": "May 13, 2026",
        "section": "Portfolio Construction",
        "read_time": "7 min read",
        "title_short": "Good, Better, Best: Which Portfolio Tier Is Right for You?",
        "card_title": "Good, Better, Best: Which Portfolio Tier Is Right for You?",
        "card_blurb": "Three legitimate portfolio strategies \u2014 from one fund to globally diversified factor tilts. The right one is the one you'll actually hold.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F3D7\uFE0F",
        "sitemap_priority": "0.85",
        "llms_entry": "**Good, Better, Best: Which Portfolio Tier Is Right for You?**: https://www.vtiandchill.com/pages/blog/good-better-best-portfolios.html \u2014 VTI \u0026 Chill\u2019s three-tier portfolio framework: Good (100% VTI), Better (60% VTI / 20% AVUV / 10% AVLV / 10% bonds), and Best (Merriman-inspired global Avantis suite of AVUS/AVUV/AVLV/AVDV/AVDS/AVES/AVEE); Fama-French factor research; Merriman $100K\u2192$53M-vs-$30M finding over 55 years",
        "skill_md_entry": "**Good, Better, Best: Which Portfolio Tier Is Right for You?**: https://www.vtiandchill.com/pages/blog/good-better-best-portfolios.html \u2014 Three-tier portfolio framework: Good (100% VTI), Better (VTI + AVUV + AVLV factor tilts), Best (Merriman-style global Avantis suite); allocation tables, expense ratios, the temperament fit for each tier",
        "webmcp_entry": "{ title: 'Good, Better, Best: Which Portfolio Tier Is Right for You?', url: '/pages/blog/good-better-best-portfolios.html', tags: ['Good Better Best portfolio', 'Avantis ETFs', 'AVUV', 'AVLV', 'AVDV', 'Paul Merriman Ultimate Buy and Hold', 'Fama-French', 'small cap value tilt', 'portfolio tiers', 'global diversification'], description: 'Three legitimate portfolio tiers \u2014 from one fund to seven. The right one is the one you can actually hold through the next bear market.' },",
    },
    # =========================================================================
    "small-cap-value-tilt-pays-off": {
        "date_iso": "2026-05-15",
        "date_human": "May 15, 2026",
        "section": "Factor Investing",
        "read_time": "7 min read",
        "title_short": "The Small Cap Value Premium: Why Tilting Your Portfolio Pays Off",
        "card_title": "The Small Cap Value Premium: Why Tilting Your Portfolio Pays Off",
        "card_blurb": "Two Nobel Prizes worth of research, a 1.6% historical premium, and the AVUV implementation that captures it.",
        "card_gradient": "linear-gradient(135deg, #16213e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F4CA",
        "sitemap_priority": "0.85",
        "llms_entry": "**The Small Cap Value Premium: Why Tilting Your Portfolio Pays Off**: https://www.vtiandchill.com/pages/blog/small-cap-value-tilt-pays-off.html \u2014 Fama-French three-factor model, Siegel/Schwartz 1926-2021 data showing small caps at 11.99% vs large caps at 10.35%, Merriman\u2019s $53M-vs-$30M Ultimate Buy \u0026 Hold result, Vanguard\u2019s 1.9 percentage point forward forecast for small over large, and an 80/20 VTI/AVUV implementation that captures the premium",
        "skill_md_entry": "**The Small Cap Value Premium: Why Tilting Your Portfolio Pays Off**: https://www.vtiandchill.com/pages/blog/small-cap-value-tilt-pays-off.html \u2014 The case for a small-cap value tilt: Fama-French three-factor model, the 1926-2021 historical premium, Merriman's Ultimate Buy and Hold result, Vanguard's 1.9% forward forecast, and how to implement with AVUV",
        "webmcp_entry": "{ title: 'The Small Cap Value Premium: Why Tilting Your Portfolio Pays Off', url: '/pages/blog/small-cap-value-tilt-pays-off.html', tags: ['small cap value premium', 'Fama-French three-factor model', 'AVUV', 'Avantis', 'factor investing', 'Paul Merriman', 'value premium', 'SMB HML factors', 'Vanguard small cap forecast'], description: 'Two Nobel Prizes worth of research, a 1.6% historical premium, and the AVUV implementation that captures it. The honest case for tilting toward small-cap value.' },",
    },
}


def update_blog_hub(slug, m):
    """Insert the blog hub card at the top of .blog-grid and bump hub lastmod in sitemap."""
    hub_path = REPO / "pages" / "blog.html"
    hub = hub_path.read_text()
    card = f"""
      <a href="./blog/{slug}.html" class="blog-card" style="text-decoration:none;color:inherit;">
        <div class="blog-card-image" style="background: {m['card_gradient']}; display:flex;align-items:center;justify-content:center;">
          <span style="font-size:3rem;">{m['card_emoji']}</span>
        </div>
        <div class="blog-card-body">
          <div class="blog-card-meta">
            <span class="blog-tag">{m['section']}</span>
            <span>{m['date_human']}</span>
            <span>{m['read_time']}</span>
          </div>
          <h3>{m['card_title']}</h3>
          <p>{m['card_blurb']}</p>
        </div>
      </a>
"""
    new_hub, n = re.subn(
        r'(<div class="blog-grid">\s*\n)',
        lambda mm: mm.group(1) + card,
        hub,
        count=1,
    )
    if n != 1:
        raise RuntimeError("blog-grid insertion point not found in pages/blog.html")
    hub_path.write_text(new_hub)
    print(f"  hub: inserted card for {slug}")


def update_sitemap(slug, m):
    sm_path = REPO / "sitemap.xml"
    sm = sm_path.read_text()

    # Bump blog hub lastmod
    sm = re.sub(
        r'(<loc>https://www\.vtiandchill\.com/pages/blog\.html</loc>\s*\n\s*<lastmod>)\d{4}-\d{2}-\d{2}',
        lambda mm: mm.group(1) + m["date_iso"],
        sm,
    )

    # Insert new <url> entry before </urlset>
    new_entry = f"""  <url>
    <loc>https://www.vtiandchill.com/pages/blog/{slug}.html</loc>
    <lastmod>{m['date_iso']}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>{m['sitemap_priority']}</priority>
  </url>

  <!-- Community & About -->"""
    if new_entry.split("<!--")[0] in sm:
        raise RuntimeError(f"sitemap already contains entry for {slug}")
    sm, n = re.subn(
        r'  <!-- Community & About -->',
        new_entry,
        sm,
        count=1,
    )
    if n != 1:
        raise RuntimeError("sitemap Community marker not found")
    sm_path.write_text(sm)
    print(f"  sitemap: added {slug}")


def update_llms_txt(slug, m):
    p = REPO / "llms.txt"
    txt = p.read_text()
    new_line = f"- {m['llms_entry']}\n"
    # Insert as the first item under '## Blog Articles' or '## Blog Posts'
    new_txt, n = re.subn(
        r"(##\s+Blog (Articles|Posts)\s*\n)",
        lambda mm: mm.group(1) + new_line,
        txt,
        count=1,
    )
    if n != 1:
        raise RuntimeError("llms.txt Blog Articles header not found")
    p.write_text(new_txt)
    print(f"  llms.txt: added {slug}")


def update_skill_md(slug, m):
    p = REPO / ".well-known" / "agent-skills" / "financial-education" / "SKILL.md"
    txt = p.read_text()
    new_line = f"- {m['skill_md_entry']}\n"
    new_txt, n = re.subn(
        r"(##\s+Blog Posts\s*\n)",
        lambda mm: mm.group(1) + new_line,
        txt,
        count=1,
    )
    if n != 1:
        raise RuntimeError("SKILL.md '## Blog Posts' header not found")
    p.write_text(new_txt)
    print(f"  SKILL.md: added {slug}")


def update_webmcp(slug, m):
    p = REPO / "webmcp.js"
    txt = p.read_text()
    new_line = "        " + m["webmcp_entry"] + "\n"
    new_txt, n = re.subn(
        r"(      const posts = \[\s*\n)",
        lambda mm: mm.group(1) + new_line,
        txt,
        count=1,
    )
    if n != 1:
        raise RuntimeError("webmcp.js posts array start not found")
    p.write_text(new_txt)
    print(f"  webmcp.js: added {slug}")


def refresh_skill_digest():
    skill_path = REPO / ".well-known" / "agent-skills" / "financial-education" / "SKILL.md"
    digest = hashlib.sha256(skill_path.read_bytes()).hexdigest()
    idx_path = REPO / ".well-known" / "agent-skills" / "index.json"
    idx_txt = idx_path.read_text()
    new_idx, n = re.subn(
        r'"digest":\s*"sha256:[a-f0-9]{64}"',
        f'"digest": "sha256:{digest}"',
        idx_txt,
        count=1,
    )
    if n != 1:
        raise RuntimeError("index.json digest line not found")
    idx_path.write_text(new_idx)
    print(f"  index.json: digest -> sha256:{digest[:16]}...")


def git_commit_push(slug, m):
    msg = (
        f"Deploy {slug} ({m['date_human']})\n\n"
        f"- New post: {m['title_short']}\n"
        f"- Updated blog hub, sitemap.xml, llms.txt, agent-skills SKILL.md, webmcp.js\n"
        f"- Refreshed agent-skills index.json digest"
    )
    subprocess.run(["git", "add", "-A"], cwd=REPO, check=True)
    subprocess.run([
        "git",
        "-c", "user.name=Joel Polanco",
        "-c", "user.email=jpole1@gmail.com",
        "commit", "-m", msg,
    ], cwd=REPO, check=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=REPO, check=True)
    print("  git: committed and pushed")


def verify_live(slug):
    print("  waiting 75s for Vercel deploy...")
    time.sleep(75)
    urls = [
        f"https://www.vtiandchill.com/pages/blog/{slug}.html",
        "https://www.vtiandchill.com/pages/blog.html",
        "https://www.vtiandchill.com/sitemap.xml",
    ]
    for u in urls:
        try:
            req = urllib.request.Request(u, method="HEAD")
            with urllib.request.urlopen(req, timeout=15) as r:
                print(f"  {r.status}: {u}")
        except Exception as e:
            print(f"  ERR: {u} -> {e}")


def indexnow_ping(slug):
    payload = {
        "host": "www.vtiandchill.com",
        "key": "d520aa54ae9340048550b8f2cb83c707",
        "keyLocation": "https://www.vtiandchill.com/d520aa54ae9340048550b8f2cb83c707.txt",
        "urlList": [
            f"https://www.vtiandchill.com/pages/blog/{slug}.html",
            "https://www.vtiandchill.com/pages/blog.html",
        ],
    }
    req = urllib.request.Request(
        "https://api.indexnow.org/IndexNow",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        print(f"  indexnow: {r.status} {r.read().decode()}")


def main():
    if len(sys.argv) < 2:
        print("Usage: deploy_post.py <slug>")
        sys.exit(2)
    slug = sys.argv[1]
    if slug not in POSTS:
        print(f"unknown slug: {slug}")
        sys.exit(2)
    m = POSTS[slug]

    html_path = REPO / "pages" / "blog" / f"{slug}.html"
    if not html_path.exists():
        print(f"missing post HTML: {html_path}")
        sys.exit(2)

    print(f"Deploying {slug} ({m['date_human']})")
    update_blog_hub(slug, m)
    update_sitemap(slug, m)
    update_llms_txt(slug, m)
    update_skill_md(slug, m)
    update_webmcp(slug, m)
    refresh_skill_digest()
    git_commit_push(slug, m)
    verify_live(slug)
    indexnow_ping(slug)
    print("Done.")


if __name__ == "__main__":
    main()
