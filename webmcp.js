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
