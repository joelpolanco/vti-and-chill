/**
 * WebMCP — Expose VTI & Chill site tools to AI agents via the browser.
 * Spec: https://webmachinelearning.github.io/webmcp/
 *
 * Tools registered:
 *   1. get-site-info     — Returns structured site overview, pages, and resources
 *   2. search-content    — Search blog posts and pages by keyword/topic
 *   3. get-course-info   — Returns course structure, pricing, and module details
 *   4. get-portfolio-info — Returns portfolio tier details (Good/Better/Best)
 */

(function () {
  'use strict';

  // Guard: only run if WebMCP API is available
  if (typeof navigator === 'undefined' || !navigator.modelContext) return;

  const mc = navigator.modelContext;
  const BASE = 'https://www.vtiandchill.com';

  // ── Tool 1: get-site-info ──
  mc.registerTool({
    name: 'get-site-info',
    description: 'Get an overview of VTI & Chill — what it is, key pages, and machine-readable resources for AI agents',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return {
        name: 'VTI & Chill',
        tagline: 'Index funds. Low fees. No Wall Street BS.',
        url: BASE,
        description: 'Financial education platform teaching long-term index fund investing. Built on the philosophy of JL Collins (The Simple Path to Wealth) and Paul Merriman (Sound Investing Portfolios).',
        coreStrategy: 'The 1-Fund Strategy — Buy VTI (US total market) or VT (global total market) and hold for decades.',
        pages: {
          home: BASE + '/',
          philosophy: BASE + '/pages/philosophy.html',
          portfolios: BASE + '/pages/portfolios.html',
          tools: BASE + '/pages/tools.html',
          learn: BASE + '/pages/learn/',
          blog: BASE + '/pages/blog.html',
          community: BASE + '/pages/community.html',
          about: BASE + '/pages/about.html'
        },
        machineResources: {
          llmsTxt: BASE + '/llms.txt',
          sitemap: BASE + '/sitemap.xml',
          apiCatalog: BASE + '/.well-known/api-catalog',
          agentSkills: BASE + '/.well-known/agent-skills/index.json',
          mcpServerCard: BASE + '/.well-known/mcp/server-card.json'
        },
        social: {
          x: 'https://x.com/VTIandChill',
          gumroad: 'https://vtiandchill.gumroad.com/l/blueprint'
        },
        disclaimer: 'VTI & Chill provides financial EDUCATION, not personalized financial ADVICE.'
      };
    }
  });

  // ── Tool 2: search-content ──
  mc.registerTool({
    name: 'search-content',
    description: 'Search VTI & Chill blog posts and pages by keyword or topic. Returns matching articles with titles, URLs, and descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword or topic (e.g., "expense ratios", "market crash recovery", "VTI vs VOO")'
        }
      },
      required: ['query'],
      additionalProperties: false
    },
    async execute({ query }) {
      const posts = [
        { title: 'The Lazy Portfolio: How 3 Funds Can Beat Most Hedge Funds', url: '/pages/blog/lazy-portfolio-three-funds.html', tags: ['three fund portfolio', 'lazy portfolio', 'Boglehead investing', 'VTI VXUS BND', 'Taylor Larimore', 'Jack Bogle', 'SPIVA active vs passive', 'index fund simplicity', 'passive investing'], description: '8.14% annualized over 30 years with three funds and zero active management — the Boglehead three-fund portfolio explained and extended to the factor-tilted Better tier.' },
        { title: 'International Diversification: Do You Really Need It?', url: '/pages/blog/international-diversification.html', tags: ['international diversification', 'home bias investing', 'AVDV ETF', 'VXUS', 'Japan lost decade', 'MSCI ACWI', 'French Poterba home bias', 'global market cap weight', 'Paul Merriman international', 'currency risk'], description: 'Japan peaked in 1989 and took 35 years to recover. The honest case for international diversification — and the allocation framework for each portfolio tier.' },
        { title: 'Why Earnings Revisions Matter More Than Earnings', url: '/pages/blog/earnings-revisions-matter-more-than-earnings.html', tags: ['earnings revisions', 'forward P/E', 'AI Class basket', 'FactSet', 'S&P 500', 'EPS', 'multiple compression', 'dot-com bubble', 'valuation', 'market commentary'], description: 'A 14.6-point Q1 2026 earnings revision running 2x the 10-year norm explains the entire gap between the AI Class’s 39.9x trailing and 21.9x forward P/E — and shifts the bear case from multiples to revisions.' },
        { title: 'Avantis vs. Vanguard: A Deep Dive Into the ETFs We Actually Recommend', url: '/pages/blog/avantis-vs-vanguard-deep-dive.html', tags: ['Avantis vs Vanguard', 'AVUV ETF', 'AVUS ETF', 'AVLV ETF', 'AVDV ETF', 'factor investing ETFs', 'Vanguard VTI VOO', 'Eduardo Repetto', 'DFA researchers', 'small cap value ETF'], description: 'Vanguard built the index fund revolution. Avantis added factor tilts backed by decades of research. A complete comparison of when to use each — and why the answer for most serious investors is both.' },
        { title: 'The Small Cap Value Premium: Why Tilting Your Portfolio Pays Off', url: '/pages/blog/small-cap-value-tilt-pays-off.html', tags: ['small cap value premium', 'Fama-French three-factor model', 'AVUV', 'Avantis', 'factor investing', 'Paul Merriman', 'value premium', 'SMB HML factors', 'Vanguard small cap forecast'], description: 'Two Nobel Prizes worth of research, a 1.6% historical premium, and the AVUV implementation that captures it. The honest case for tilting toward small-cap value.' },
        { title: 'Good, Better, Best: Which Portfolio Tier Is Right for You?', url: '/pages/blog/good-better-best-portfolios.html', tags: ['Good Better Best portfolio', 'Avantis ETFs', 'AVUV', 'AVLV', 'AVDV', 'Paul Merriman Ultimate Buy and Hold', 'Fama-French', 'small cap value tilt', 'portfolio tiers', 'global diversification'], description: 'Three legitimate portfolio tiers — from one fund to seven. The right one is the one you can actually hold through the next bear market.' },
        { title: 'The \'Just Make More Money\' Guy Is Selling You a Lottery Ticket', url: '/pages/blog/just-make-more-money-trap.html', tags: ['options trading scams', 'retail options statistics', 'Barber Odean', 'finfluencer scams', 'bell curve meme', '0DTE losses', 'savings rate FI', 'get rich quick courses', 'Mr Money Mustache', 'casino comparison'], description: 'A viral LinkedIn options coach mocked indexers with the bell-curve meme. We break down what is true (savings rate matters), what is false (retail options loss rates above 80%), and the sells-courses tell that exposes the entire get-rich-quick playbook.' },
        { title: 'One Fund to Rule Them All: The Case for VTI', url: '/pages/blog/one-fund-vti-case.html', tags: ['VTI', 'Vanguard Total Stock Market', 'one fund portfolio', 'VTI vs VOO', 'expense ratio', 'CRSP US Total Market Index', 'cap weighting', 'self-cleansing index', 'simple path to wealth'], description: 'Why a single fund — VTI — beats roughly 90% of professionally managed portfolios over 15+ years. 3,600 companies, 0.03% fee, zero decisions required.' },
        { title: 'We Tried to Build a Buffett Stock Screener (And What We Learned)', url: '/pages/blog/buffett-screener-experiment.html', tags: ['Warren Buffett', 'Charlie Munger', 'stock screener', 'Bessembinder', 'wealth concentration', 'individual stocks', 'Berkshire Hathaway', '90/10 portfolio', 'qualitative analysis', 'moat', 'Google Sheets'], description: 'We built a Buffett-Munger stock screener in Google Sheets. Bessembinder: only ~4% of US stocks generated all net wealth. Why qualitative judgment breaks the model and Buffett still recommends 90/10 indexing. Free download.' },
        { title: 'Time in the Market Beats Timing the Market — Here\'s the Proof', url: '/pages/blog/time-in-market-beats-timing.html', tags: ['time in market', 'market timing', 'best days analysis', 'JP Morgan', 'DALBAR', 'buy and hold', 'Schwab study', 'Peter Lynch', 'long-term investing'], description: 'Missing the 10 best days cuts 20-year returns in half. 76% of best days happen in bear markets. The data, the studies, and what to do instead.' },
        { title: 'The 4% Rule: Your Ticket to Never Running Out of Money', url: '/pages/blog/four-percent-rule.html', tags: ['4% rule', 'Trinity Study', 'safe withdrawal rate', 'FI number', '25x rule', 'sequence of returns risk', 'William Bengen', 'FIRE', 'retirement planning'], description: 'Annual Expenses × 25 = your FI number. The Trinity Study, sequence-of-returns risk, and the math behind every FIRE plan.' },
        { title: 'Wall Street Wants You Confused (And Broke)', url: '/pages/blog/wall-street-wants-you-confused.html', tags: ['Wall Street fees', 'expense ratio', 'active vs passive', 'Jack Bogle', 'fiduciary rule', 'commission advisor', 'fee tyranny', 'index fund revolution'], description: 'Complexity is the business model. Jargon is the moat. Five questions that cut through any sales pitch.' },
        { title: 'F-You Money: Why Financial Independence Changes Everything', url: '/pages/blog/fu-money-financial-independence.html', tags: ['F-You Money', 'financial independence', 'FIRE', '25x rule', '4% rule', 'Trinity Study', 'JL Collins', 'savings rate', 'Coast FI', 'Lean FI'], description: 'JL Collins framework for FI: the 25x rule, 4% safe withdrawal, the spectrum from Starter FU Money to Full FI, and why savings rate beats income.' },
        { title: 'Compound Interest: The Eighth Wonder of the World', url: '/pages/blog/compound-interest.html', tags: ['compound interest', 'Rule of 72', 'time value of money', 'Early Emma Late Larry', 'expense ratios', 'fees', 'starting early'], description: '$10K at 10% becomes $452K over 40 years. Early Emma beats Late Larry with 1/3 the contributions. The Rule of 72 and how 1% fees destroy 24% of ending wealth.' },
        { title: 'Dollar-Cost Averaging: Your Secret Weapon Against Volatility', url: '/pages/blog/dollar-cost-averaging.html', tags: ['dollar-cost averaging', 'DCA', 'market timing', 'volatility', '401k', 'automatic investing', 'lump sum vs DCA'], description: 'Invest fixed amounts on a fixed schedule. Buy more when prices fall, fewer when they rise. The 401(k) is DCA on autopilot. Behavior beats timing.' },
        { title: 'New Tool: See If Your Stock Picks Actually Beat VTI (Beta)', url: '/pages/blog/portfolio-vs-vti-tool-launch.html', tags: ['portfolio comparison', 'alpha calculator', 'CSV import', 'beta', 'VTI', 'stock picking', 'benchmark', 'Robinhood', 'Vanguard', 'Fidelity', 'Schwab'], description: 'Free, browser-based calculator that replays your brokerage history against VTI. Beta testers wanted.' },
        { title: 'The Power of Doing Nothing: How Inactivity Beats Hyperactivity', url: '/pages/blog/power-of-doing-nothing.html', tags: ['buy and hold', 'behavioral finance', 'Fidelity dead investor study', 'DALBAR', 'behavior gap', 'inactivity', 'sit on your ass investing', 'Charlie Munger'], description: 'Fidelity dead investors outperformed. DALBAR shows 3.6% behavior gap costs $1.3M over 30 years. The case for disciplined inactivity.' },
        { title: 'The Market Always Goes Up — 100 Years of Proof', url: '/pages/blog/the-market-always-goes-up.html', tags: ['market history', 'S&P 500 returns', 'crash recovery', 'rolling returns', 'long-term investing', '100 years'], description: 'S&P 500 has returned ~10% per year since 1926. 100% of rolling 20-year periods positive. Every crash recovers.' },
        { title: 'Why Index Funds Beat 90% of Professional Fund Managers', url: '/pages/blog/index-funds-beat-fund-managers.html', tags: ['index funds', 'active management', 'SPIVA', 'fund managers', 'expense ratios', 'Warren Buffett bet', 'passive investing', 'fees'], description: '79% of active large-cap funds underperformed S&P 500 in 2025. SPIVA data, Buffett $1M bet, and fee math prove index funds win.' },
        { title: 'VTI vs VOO: Which Index Fund Should You Buy?', url: '/pages/blog/vti-vs-voo.html', tags: ['VTI', 'VOO', 'index fund comparison', 'total market', 'S&P 500', 'expense ratio'], description: 'Comparing total US market (VTI) vs S&P 500 (VOO) index funds — performance, diversification, and cost.' },
        { title: 'The Psychology of Staying the Course', url: '/pages/blog/psychology-of-staying-the-course.html', tags: ['behavioral finance', 'psychology', 'Dalbar', 'behavior gap', 'panic selling'], description: 'Why investors underperform the market and how to avoid the behavior gap.' },
        { title: 'The Small-Cap Value Premium: Real or Dead?', url: '/pages/blog/small-cap-value-premium.html', tags: ['small cap value', 'factor investing', 'Fama-French', 'AVUV', 'premium'], description: 'Examining whether the small-cap value premium still exists using Fama-French data.' },
        { title: 'Review: The Simple Path to Wealth by JL Collins', url: '/pages/blog/simple-path-to-wealth-review.html', tags: ['JL Collins', 'book review', 'simple path to wealth', 'FIRE', 'index investing'], description: 'Why JL Collins book is the best first read for any new investor.' },
        { title: 'Q1 2026 Portfolio Check-In: Stay the Course', url: '/pages/blog/q1-2026-portfolio-check-in.html', tags: ['portfolio', 'Q1 2026', 'market analysis', 'stay the course', 'quarterly'], description: 'Q1 2026 market review and why passive investors should not react to volatility.' },
        { title: 'Buy. Hold. Chill. The 3-Word Investing Strategy', url: '/pages/blog/buy-hold-chill.html', tags: ['buy and hold', 'strategy', 'passive investing', 'simplicity', 'chill'], description: 'The simplest investing strategy that beats 90% of professionals.' }
      ];

      const q = query.toLowerCase();
      const results = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q))
      );

      return {
        query,
        resultCount: results.length,
        results: results.map(r => ({
          title: r.title,
          url: BASE + r.url,
          description: r.description
        })),
        allPostsUrl: BASE + '/pages/blog.html'
      };
    }
  });

  // ── Tool 3: get-course-info ──
  mc.registerTool({
    name: 'get-course-info',
    description: 'Get details about The Chill Investor\'s Blueprint course — modules, pricing, what\'s included',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return {
        name: "The Chill Investor's Blueprint",
        price: '$79 one-time payment',
        subscription: false,
        access: 'Lifetime',
        purchaseUrl: 'https://vtiandchill.gumroad.com/l/blueprint',
        courseUrl: BASE + '/pages/learn/',
        freeClasses: ['Class 1', 'Class 2'],
        paidClasses: ['Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'],
        modules: [
          { number: 1, title: 'Why Index Funds Win', free: true, url: BASE + '/pages/learn/class-1.html' },
          { number: 2, title: 'The Real Cost of Fees', free: true, url: BASE + '/pages/learn/class-2.html' },
          { number: 3, title: 'The 1-Fund Strategy', free: false, description: 'The heart of VTI & Chill — how to build wealth with a single fund (VTI or VT)' },
          { number: 4, title: 'Portfolio Construction', free: false, description: 'Good / Better / Best portfolio tiers using Vanguard and Avantis ETFs' },
          { number: 5, title: 'Tax-Advantaged Accounts', free: false, description: '401k, IRA, Roth — which accounts to use and in what order' },
          { number: 6, title: 'When to Sell (Almost Never)', free: false, description: 'The rules for selling and rebalancing' },
          { number: 7, title: 'Building Your Plan', free: false, description: 'Putting it all together with your personal investing plan' },
          { number: 8, title: 'Staying the Course', free: false, description: 'Behavioral finance and the psychology of long-term investing' }
        ],
        disclaimer: 'VTI & Chill provides financial EDUCATION, not personalized financial ADVICE.'
      };
    }
  });

  // ── Tool 4: get-portfolio-info ──
  mc.registerTool({
    name: 'get-portfolio-info',
    description: 'Get VTI & Chill portfolio tier details — Good (1 fund), Better (3-4 funds), Best (multi-factor Avantis). Includes ETF tickers, allocations, and expense ratios.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return {
        pageUrl: BASE + '/pages/portfolios.html',
        tiers: [
          {
            name: 'Good (The 1-Fund Strategy)',
            description: 'Maximum simplicity. One fund. Done.',
            funds: [
              { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: '100%', expenseRatio: '0.03%', note: 'US investors' },
              { ticker: 'VT', name: 'Vanguard Total World Stock ETF', allocation: '100%', expenseRatio: '0.07%', note: 'International investors or those wanting global diversification' }
            ]
          },
          {
            name: 'Better (Core + Tilt)',
            description: 'Add small-cap value tilt and real estate for higher expected returns.',
            funds: [
              { ticker: 'VTI', allocation: '60%', expenseRatio: '0.03%' },
              { ticker: 'AVUV', name: 'Avantis U.S. Small Cap Value ETF', allocation: '20%', expenseRatio: '0.25%' },
              { ticker: 'VNQ', name: 'Vanguard Real Estate ETF', allocation: '10%', expenseRatio: '0.12%' },
              { ticker: 'AVDV', name: 'Avantis International Small Cap Value ETF', allocation: '10%', expenseRatio: '0.36%' }
            ]
          },
          {
            name: 'Best (Multi-Factor Avantis)',
            description: 'Full factor diversification using Avantis systematic ETFs.',
            funds: [
              { ticker: 'AVUS', name: 'Avantis U.S. Equity ETF', expenseRatio: '0.15%' },
              { ticker: 'AVUV', name: 'Avantis U.S. Small Cap Value ETF', expenseRatio: '0.25%' },
              { ticker: 'AVLV', name: 'Avantis U.S. Large Cap Value ETF', expenseRatio: '0.15%' },
              { ticker: 'AVDV', name: 'Avantis International Small Cap Value ETF', expenseRatio: '0.36%' },
              { ticker: 'AVES', name: 'Avantis Emerging Markets Equity ETF', expenseRatio: '0.33%' },
              { ticker: 'VNQ', name: 'Vanguard Real Estate ETF', expenseRatio: '0.12%' }
            ]
          }
        ],
        disclaimer: 'VTI & Chill provides financial EDUCATION, not personalized financial ADVICE. These are example portfolios, not recommendations for any individual.'
      };
    }
  });

})();
