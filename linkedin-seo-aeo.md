# LinkedIn Post — SEO + AEO

**Voice:** Founder, confident, slightly irreverent, anti-wall-street
**Length:** ~260 words

---

Spent the last few weeks turning vtiandchill.com into a site that actually shows up — first for humans, now for the agents reading the web on their behalf.

The SEO playbook, fast version:

— Rewrote every title and meta description for click-through, not keyword stuffing
— Canonicals on every page so Google stops fighting itself
— Open Graph + Twitter cards (1200x630) so links don't look broken when shared
— JSON-LD structured data: Organization, WebSite, Course, Article, BreadcrumbList, FAQPage on every post
— sitemap.xml + robots.txt explicitly allowing GPTBot, PerplexityBot, ClaudeBot, Google-Extended, meta-externalagent
— IndexNow ping on every push via GitHub Actions so Bing and Yandex know within seconds

That's the table stakes. It works, traffic is up.

But more importantly, we added AEO — Agent Engine Optimization.

Cloudflare's isitagentready.com gave us the spec, and we built every line of it:

— /llms.txt at the root, structured Markdown agents can read in one fetch
— Content-Signal header in robots.txt (search=yes, ai-input=yes, ai-train=no) so AI crawlers know which use is allowed
— /.well-known/api-catalog (RFC 9727) linking llms.txt, sitemap, robots
— /.well-known/mcp/server-card.json (SEP-1649) so MCP-aware agents see capabilities
— /.well-known/agent-skills/ with two SKILL.md files (site-navigation, financial-education) and SHA-256 digests
— RFC 8288 Link headers on every response advertising the catalog, sitemap, and skills
— Vercel Edge middleware for Accept: text/markdown — agents get clean markdown, humans get HTML
— webmcp.js with 4 callable tools so an in-page agent can search posts and get course info without a single click

If an AI is the next reader, it should find the answer without scraping. That's the whole bet.

The blog post breakdown drops next week.
