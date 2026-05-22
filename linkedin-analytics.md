# LinkedIn Post — Analytics Stack

**Voice:** Founder, confident, slightly irreverent
**Length:** ~265 words

---

Building in public update — we're finally turning on the dashboards at vtiandchill.com.

For the first few months I was deliberately flying blind. The thesis was simple: write a good post, ship it, repeat. Analytics is a beautiful way to procrastinate.

That phase is over. This week we wired up the full measurement stack:

— Google Search Console — verified via DNS TXT record, sitemap submitted, indexing requests queued for every blog post. Now I can see exactly which queries Google ranks us for, what the click-through rate is, and which pages get impressions but no clicks (huge tell for bad title tags).

— Bing Webmaster Tools — same drill, separate ecosystem. Bing powers Copilot, ChatGPT search, DuckDuckGo, and Yahoo. About 12% of the search market, but a higher share of AI-routed traffic. Worth the 10 minutes.

— Google Analytics 4 — gtag.js loaded site-wide, enhanced measurement on, custom events for course-clicks and newsletter conversions. Pairing it with GSC inside Looker Studio next week so I can finally see "people who searched X → landed on post Y → clicked the course."

If you want to do this on your own site, your AI tool of choice can do most of it in one prompt. Try something like:

"Walk me through verifying my domain in Google Search Console and Bing Webmaster Tools using a DNS TXT record. Then generate the exact GA4 gtag.js snippet for tracking ID G-XXXXX, including enhanced measurement and a custom event for newsletter signups. Tell me where to paste it in my HTML."

Three steps. Maybe 30 minutes total. You'll learn more about what your audience actually wants in week one than you did in the previous six months.

The investing parallel is too on-the-nose to ignore — you can't optimize what you don't measure.
