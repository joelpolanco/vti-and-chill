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
    # =========================================================================
    "avantis-vs-vanguard-deep-dive": {
        "date_iso": "2026-05-18",
        "date_human": "May 18, 2026",
        "section": "Portfolio Construction",
        "read_time": "5 min read",
        "title_short": "Avantis vs. Vanguard: A Deep Dive Into the ETFs We Actually Recommend",
        "card_title": "Avantis vs. Vanguard: A Deep Dive Into the ETFs We Actually Recommend",
        "card_blurb": "Vanguard built the index fund revolution. Avantis added factor tilts backed by decades of research. Here\u2019s when to use each \u2014 and why the answer for most serious investors is both.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F52C",
        "sitemap_priority": "0.85",
        "llms_entry": "**Avantis vs. Vanguard: A Deep Dive Into the ETFs We Actually Recommend**: https://www.vtiandchill.com/pages/blog/avantis-vs-vanguard-deep-dive.html \u2014 Complete comparison of Vanguard (VTI 0.03%, VOO, VBR) vs. Avantis (AVUS 0.15%, AVLV 0.15%, AVUV 0.25% with 19.27% 5-year return, AVSC, AVDV 0.36% with 15.89% 5-year return, AVDS, AVES, AVEE); philosophy differences between pure cap-weighting and factor-tilted methodology; founded by former DFA researchers in 2019; the profitability screening that differentiates AVUV from VBR; $20B+ AVUV AUM",
        "skill_md_entry": "**Avantis vs. Vanguard: A Deep Dive Into the ETFs We Actually Recommend**: https://www.vtiandchill.com/pages/blog/avantis-vs-vanguard-deep-dive.html \u2014 Full Avantis vs. Vanguard comparison: expense ratios, factor philosophy, 5-year returns; AVUV profitability screening vs. VBR; the Good/Better/Best portfolio tier mapping; when to use each company",
        "webmcp_entry": "{ title: 'Avantis vs. Vanguard: A Deep Dive Into the ETFs We Actually Recommend', url: '/pages/blog/avantis-vs-vanguard-deep-dive.html', tags: ['Avantis vs Vanguard', 'AVUV ETF', 'AVUS ETF', 'AVLV ETF', 'AVDV ETF', 'factor investing ETFs', 'Vanguard VTI VOO', 'Eduardo Repetto', 'DFA researchers', 'small cap value ETF'], description: 'Vanguard built the index fund revolution. Avantis added factor tilts backed by decades of research. A complete comparison of when to use each \u2014 and why the answer for most serious investors is both.' },",
    },
    # =========================================================================
    "international-diversification": {
        "date_iso": "2026-05-22",
        "date_human": "May 22, 2026",
        "section": "Portfolio Construction",
        "read_time": "5 min read",
        "title_short": "International Diversification: Do You Really Need It?",
        "card_title": "International Diversification: Do You Really Need It?",
        "card_blurb": "Japan peaked in 1989 and didn\u2019t recover for 35 years. US investors making the same 100%-domestic bet deserve to understand what they\u2019re wagering on.",
        "card_gradient": "linear-gradient(135deg, #16213e 0%, #0f3460 100%)",
        "card_emoji": "\U0001F30D",
        "sitemap_priority": "0.85",
        "llms_entry": "**International Diversification: Do You Really Need It?**: https://www.vtiandchill.com/pages/blog/international-diversification.html \u2014 Japan\u2019s Nikkei peaked in 1989 and took 35 years to recover; French and Poterba 1991 home-bias research (US investors held 95%+ domestic despite US being <50% of global market cap); MSCI ACWI US weight at 60-65%; AVDV 15.89% 5-year return; currency risk, political risk, and the extended-underperformance behavioral challenge; allocation recommendations by Good/Better/Best tier",
        "skill_md_entry": "**International Diversification: Do You Really Need It?**: https://www.vtiandchill.com/pages/blog/international-diversification.html \u2014 The case for and against international: Japan's lost 35 years, home bias research, AVDV as the recommended first step, and portfolio-tier allocation framework (0% Good / 10-15% Better / 25-35% Best)",
        "webmcp_entry": "{ title: 'International Diversification: Do You Really Need It?', url: '/pages/blog/international-diversification.html', tags: ['international diversification', 'home bias investing', 'AVDV ETF', 'VXUS', 'Japan lost decade', 'MSCI ACWI', 'French Poterba home bias', 'global market cap weight', 'Paul Merriman international', 'currency risk'], description: 'Japan peaked in 1989 and took 35 years to recover. The honest case for international diversification \u2014 and the allocation framework for each portfolio tier.' },",
    },
    # =========================================================================
    "lazy-portfolio-three-funds": {
        "date_iso": "2026-05-25",
        "date_human": "May 25, 2026",
        "section": "Portfolio Construction",
        "read_time": "4 min read",
        "title_short": "The Lazy Portfolio: How 3 Funds Can Beat Most Hedge Funds",
        "card_title": "The Lazy Portfolio: How 3 Funds Can Beat Most Hedge Funds",
        "card_blurb": "8.14% annualized over 30 years. Three funds. Zero Bloomberg terminals. The Boglehead three-fund portfolio isn\u2019t for beginners \u2014 it\u2019s the destination serious investors arrive at after trying everything else.",
        "card_gradient": "linear-gradient(135deg, #0f3460 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F6CB\uFE0F",
        "sitemap_priority": "0.85",
        "llms_entry": "**The Lazy Portfolio: How 3 Funds Can Beat Most Hedge Funds**: https://www.vtiandchill.com/pages/blog/lazy-portfolio-three-funds.html \u2014 Bogleheads three-fund portfolio (VTI + VXUS + BND); 8.14% 30-year annualized return with -43.68% max drawdown; Taylor Larimore and John Bogle\'s case for simplicity; SPIVA showing 90% active managers underperform over 15 years; the cognitive load and behavioral argument for lazy investing; VTI \u0026 Chill versions from two-fund to factor-tilted four-fund",
        "skill_md_entry": "**The Lazy Portfolio: How 3 Funds Can Beat Most Hedge Funds**: https://www.vtiandchill.com/pages/blog/lazy-portfolio-three-funds.html \u2014 Three-fund portfolio guide: VTI + VXUS + BND, 8.14% 30-year return, Taylor Larimore's case, behavioral advantages of simplicity, and VTI & Chill portfolio variants",
        "webmcp_entry": "{ title: 'The Lazy Portfolio: How 3 Funds Can Beat Most Hedge Funds', url: '/pages/blog/lazy-portfolio-three-funds.html', tags: ['three fund portfolio', 'lazy portfolio', 'Boglehead investing', 'VTI VXUS BND', 'Taylor Larimore', 'Jack Bogle', 'SPIVA active vs passive', 'index fund simplicity', 'passive investing'], description: '8.14% annualized over 30 years with three funds and zero active management \u2014 the Boglehead three-fund portfolio explained and extended to the factor-tilted Better tier.' },",
    },
    # =========================================================================
    "bonds-are-boring": {
        "date_iso": "2026-05-29",
        "date_human": "May 29, 2026",
        "section": "Asset Allocation",
        "read_time": "5 min read",
        "title_short": "Bonds Are Boring (And That's Exactly Why You Need Them)",
        "card_title": "Bonds Are Boring (And That's Exactly Why You Need Them)",
        "card_blurb": "Nobody posts about their bond allocation going up 2%. But in 2008-2009, bonds kept investors from panic-selling at the bottom \u2014 which turned out to be worth a lot more than any hot stock pick.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #4a5568 100%)",
        "card_emoji": "\U0001F4DC",
        "sitemap_priority": "0.85",
        "llms_entry": "**Bonds Are Boring (And That's Exactly Why You Need Them)**: https://www.vtiandchill.com/pages/blog/bonds-are-boring.html \u2014 Behavioral case for bonds: keeping investors from panic-selling during bear markets; long-term Treasuries lost 30% in 2022 (Bloomberg Agg -13%); 100-minus-age vs 120-minus-age allocation rules; BND (0.03%) vs AVIG (0.15%) vs TIPS; Paul Merriman's 50% intermediate Treasury / 30% short Treasury / 20% short TIPS recommendation; duration risk explained",
        "skill_md_entry": "**Bonds Are Boring (And That's Exactly Why You Need Them)**: https://www.vtiandchill.com/pages/blog/bonds-are-boring.html \u2014 Behavioral and mathematical case for bonds: the panic-selling prevention function, 2022 duration disaster, age-based allocation rules, BND vs AVIG vs TIPS options, Merriman bond split",
        "webmcp_entry": "{ title: 'Bonds Are Boring (And That\'s Exactly Why You Need Them)', url: '/pages/blog/bonds-are-boring.html', tags: ['bonds portfolio', 'BND Vanguard bond ETF', '60 40 portfolio', 'bond allocation age', 'bond duration risk 2022', 'TIPS inflation protection', 'AVIG Avantis', '100 minus age rule', 'Paul Merriman bonds', 'behavioral finance bonds'], description: 'Bonds\' real job isn\'t generating returns \u2014 it\'s keeping you from panic-selling your stocks at the worst possible time. The behavioral, mathematical, and practical case for BND.' },",
    },
    # =========================================================================
    "reits-in-portfolio": {
        "date_iso": "2026-06-01",
        "date_human": "June 1, 2026",
        "section": "Asset Allocation",
        "read_time": "5 min read",
        "title_short": "REITs: Should Real Estate Be in Your Index Portfolio?",
        "card_title": "REITs: Should Real Estate Be in Your Index Portfolio?",
        "card_blurb": "12.7% annualized from 1972-2023, genuine diversification benefits, meaningful dividend income \u2014 but VTI already owns 3-4% real estate. Here\u2019s the honest case for VNQ and AVRE.",
        "card_gradient": "linear-gradient(135deg, #16213e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F3E2",
        "sitemap_priority": "0.85",
        "llms_entry": "**REITs: Should Real Estate Be in Your Index Portfolio?**: https://www.vtiandchill.com/pages/blog/reits-in-portfolio.html \u2014 FTSE NAREIT All Equity REITs 12.7% annual return 1972-2023 vs S&P 500 10.2%; 25-year REIT return 11.4% vs 7.6%; VNQ (0.13%) vs AVRE (0.17%); REIT correlation benefits per Janus Henderson research; VTI already holds 3-4% real estate; tax inefficiency of REIT dividends in taxable accounts; Good/Better/Best tier recommendations",
        "skill_md_entry": "**REITs: Should Real Estate Be in Your Index Portfolio?**: https://www.vtiandchill.com/pages/blog/reits-in-portfolio.html \u2014 REIT case for index investors: NAREIT 12.7% historical return, VNQ vs AVRE, tax account placement, correlation benefits, and portfolio-tier verdict (skip for Good, 5-10% in tax-advantaged for Better/Best)",
        "webmcp_entry": "{ title: 'REITs: Should Real Estate Be in Your Index Portfolio?', url: '/pages/blog/reits-in-portfolio.html', tags: ['REITs index portfolio', 'VNQ Vanguard real estate', 'AVRE Avantis REIT', 'NAREIT returns', 'REIT dividend yield', 'REIT correlation', 'VTI real estate exposure', 'REIT tax efficiency', 'real estate investment trust'], description: '12.7% annualized from 1972-2023 vs 10.2% for the S&P 500. The honest case for VNQ and AVRE \u2014 when to add them and when to skip.' },",
    },
    # =========================================================================
    "factor-investing-explained": {
        "date_iso": "2026-06-05",
        "date_human": "June 5, 2026",
        "section": "Factor Investing",
        "read_time": "6 min read",
        "title_short": "Factor Investing Explained: Value, Size, and Momentum",
        "card_title": "Factor Investing Explained: Value, Size, and Momentum",
        "card_blurb": "SMB, HML, RMW \u2014 demystified. The five factors with real academic backing, why AVUV combines value and profitability, and how to implement factor tilts without a PhD.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        "card_emoji": "\U0001F9EA",
        "sitemap_priority": "0.85",
        "llms_entry": "**Factor Investing Explained: Value, Size, and Momentum**: https://www.vtiandchill.com/pages/blog/factor-investing-explained.html \u2014 Five factors: market beta (5-7% premium), size/SMB (~1.5-2% premium), value/HML (4.8% annualized per Fama-French Tuck paper 1926-2004), profitability/RMW (Fama-French five-factor model), momentum; risk vs. behavioral explanations for persistence; AVUV value+profitability combination avoids value traps; three implementation portfolios from simple 80/20 VTI/AVUV to full global Best tier",
        "skill_md_entry": "**Factor Investing Explained: Value, Size, and Momentum**: https://www.vtiandchill.com/pages/blog/factor-investing-explained.html \u2014 Jargon-free guide to the five factors: market, size (SMB), value (HML), profitability (RMW), momentum; why AVUV's value+profitability combination outperforms plain value indexes; three implementation portfolio templates",
        "webmcp_entry": "{ title: 'Factor Investing Explained: Value, Size, and Momentum', url: '/pages/blog/factor-investing-explained.html', tags: ['factor investing explained', 'Fama French five factor model', 'value factor HML', 'size factor SMB', 'momentum factor', 'profitability RMW', 'AVUV factor ETF', 'Warren Buffett value investing', 'Dimensional Fund Advisors', 'factor premium persistence'], description: 'The five factors with real academic backing \u2014 explained without the Greek letters. How to implement value, size, and profitability tilts using the Avantis ETF lineup.' },",
    },
    # =========================================================================
    "rebalancing-free-lunch": {
        "date_iso": "2026-06-08",
        "date_human": "June 8, 2026",
        "section": "Portfolio Management",
        "read_time": "5 min read",
        "title_short": "Rebalancing: The Free Lunch of Investing",
        "card_title": "Rebalancing: The Free Lunch of Investing",
        "card_blurb": "30 minutes per year. Mechanically buys low and sells high. Proven to improve risk-adjusted returns. The most underrated discipline in personal finance \u2014 explained.",
        "card_gradient": "linear-gradient(135deg, #0f3460 0%, #16213e 100%)",
        "card_emoji": "\u2696\uFE0F",
        "sitemap_priority": "0.85",
        "llms_entry": "**Rebalancing: The Free Lunch of Investing**: https://www.vtiandchill.com/pages/blog/rebalancing-free-lunch.html \u2014 Morningstar's mathematical proof that rebalancing always beats buy-and-hold when assets have equal long-term returns; Vanguard data showing a 60/40 portfolio drifting to 80% equities by 2021 without rebalancing; Morgan Stanley annual + 10-20% threshold hybrid approach; tax-smart strategies (new contributions, tax-advantaged selling, tax-loss harvesting); factor portfolio rebalancing to maintain AVUV/AVDV tilts; Merriman's annual rebalancing recommendation",
        "skill_md_entry": "**Rebalancing: The Free Lunch of Investing**: https://www.vtiandchill.com/pages/blog/rebalancing-free-lunch.html \u2014 Why rebalancing improves risk-adjusted returns; annual vs. threshold approaches; tax-smart strategies; the drift problem in factor portfolios; Merriman's case for annual rebalancing",
        "webmcp_entry": "{ title: 'Rebalancing: The Free Lunch of Investing', url: '/pages/blog/rebalancing-free-lunch.html', tags: ['portfolio rebalancing', 'rebalancing strategy', 'annual rebalancing', 'tax-smart rebalancing', 'threshold rebalancing', 'Morningstar rebalancing research', 'Vanguard portfolio drift', 'Paul Merriman rebalancing', 'buy low sell high', 'factor portfolio maintenance'], description: '30 minutes per year. Mechanically forces buy-low-sell-high. Mathematically proven to improve risk-adjusted returns. The complete guide to portfolio rebalancing.' },",
    },
    # =========================================================================
    "wallstreetbets-hall-of-shame": {
        "date_iso": "2026-06-12",
        "date_human": "June 12, 2026",
        "section": "Anti-Guru Reality Check",
        "read_time": "6 min read",
        "title_short": "The WallStreetBets Hall of Shame: What YOLO Trading Really Costs",
        "card_title": "The WallStreetBets Hall of Shame: What YOLO Trading Really Costs",
        "card_blurb": "1RONYMAN\u2019s $57K box spread debt. analfarmer2 turning $600K into zero at 19. The GUH guy. Not stupid people \u2014 human people doing exactly what behavioral finance predicts.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #e74c3c 100%)",
        "card_emoji": "\U0001F3B0",
        "sitemap_priority": "0.85",
        "llms_entry": "**The WallStreetBets Hall of Shame: What YOLO Trading Really Costs**: https://www.vtiandchill.com/pages/blog/wallstreetbets-hall-of-shame.html \u2014 WSB case studies: 1RONYMAN box spread ($5K \u2192 $57K debt), analfarmer2 ($600K \u2192 $0 at 19), GUH guy (live-streamed collapse), $10M GME diamond hands loss; XIV inverse volatility product -93% wipeout; Barber-Odean most-active traders underperform by 6.5% annually; DALBAR 3-5% annual investor behavior gap; overconfidence bias, gambler's fallacy, escalation of commitment; VTI returned 20-30% in 2019 while analfarmer2 went to zero",
        "skill_md_entry": "**The WallStreetBets Hall of Shame: What YOLO Trading Really Costs**: https://www.vtiandchill.com/pages/blog/wallstreetbets-hall-of-shame.html \u2014 Behavioral finance autopsy of WSB's greatest disasters: 1RONYMAN, analfarmer2, GUH guy, GME diamond hands; Kahneman/Tversky biases in action; Barber-Odean and DALBAR data; VTI as the boring alternative that wins",
        "webmcp_entry": "{ title: 'The WallStreetBets Hall of Shame: What YOLO Trading Really Costs', url: '/pages/blog/wallstreetbets-hall-of-shame.html', tags: ['wallstreetbets hall of shame', 'options trading disasters', 'analfarmer2 story', '1RONYMAN box spread', 'GME diamond hands', 'overconfidence bias', 'DALBAR investor behavior', 'Barber Odean trading study', 'behavioral finance', 'VTI vs options trading'], description: 'A 19-year-old with $600K, a man who invented a debt machine, and $10M in GME losses. Not stupid people \u2014 human people. A behavioral finance autopsy of WSB\'s greatest disasters.' },",
    },
    # =========================================================================
    "denominator-does-most-of-the-work": {
        "date_iso": "2026-05-27",
        "date_human": "May 27, 2026",
        "section": "Market Commentary",
        "read_time": "7 min read",
        "title_short": "The Denominator Does Most of the Work",
        "card_title": "The Denominator Does Most of the Work",
        "card_blurb": "The AI Class sits at 42.2x trailing P/E and 21.8x forward P/E on the same day. That 20-turn spread isn\u2019t a quirk \u2014 the denominator is doing all the valuation work.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F4CA",
        "sitemap_priority": "0.85",
        "llms_entry": "**The Denominator Does Most of the Work**: https://www.vtiandchill.com/pages/blog/denominator-does-most-of-the-work.html \u2014 Explains the mechanics of trailing vs. forward P/E and why the gap between them is the most important valuation signal during fast-earnings-growth regimes; AI Class basket at 42.2x trailing and 21.8x forward P/E (same basket, same day), implying ~93% earnings growth in the median name; S&P 500 forward P/E at 20.9x per FactSet May 1 2026 data; IT net margins at 29.1% in Q1 2026 (highest since 2009) and 84% of S&P 500 names beating by 12.3% vs. 5-year avg of 7.3%; dot-com peak of 152x trailing on Evercore ISI darlings basket (March 2000) vs. today\u2019s 42.2x \u2014 key difference is the quality of the denominator (74% of dot-com names had negative cash flow; today\u2019s top-5 AI Class names NVDA/GOOGL/MSFT/AMZN/TSM generate hundreds of billions in net income and represent 64.8% of basket market cap); $700B 2026 hyperscaler capex flowing through to NVDA, AVGO, MRVL, ASML, TSM, VRT, GEV, ETN; three things to track: earnings revisions, capex flow-through, top-5 concentration; includes link to copy-and-go Google Sheets AI Class P/E Monitor",
        "skill_md_entry": "**The Denominator Does Most of the Work**: https://www.vtiandchill.com/pages/blog/denominator-does-most-of-the-work.html \u2014 Trailing vs. forward P/E mechanics explained via the AI Class basket (42.2x trailing / 21.8x forward); dot-com 152x comparison; three inputs that move forward P/E: earnings revisions, hyperscaler capex flow-through, top-5 concentration at 64.8%",
        "webmcp_entry": "{ title: 'The Denominator Does Most of the Work', url: '/pages/blog/denominator-does-most-of-the-work.html', tags: ['P/E', 'valuation', 'AI', 'forward P/E', 'market commentary'], description: 'The AI Class sits at 42.2x trailing and 21.8x forward P/E on the same day \u2014 the 20-turn gap is the entire valuation story, driven by the denominator.' },",
    },
    "gamestop-cautionary-tale": {
        "date_iso": "2026-06-19",
        "date_human": "June 19, 2026",
        "section": "Behavioral Finance",
        "read_time": "7 min read",
        "title_short": "The GameStop Saga",
        "card_title": "The GameStop Saga",
        "card_blurb": "How the GameStop meme-stock frenzy actually played out for retail investors \u2014 narrative bias, social proof, diamond hands, and what VTI investors were doing instead.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**The GameStop Saga: A Cautionary Tale Disguised as a Victory**: https://www.vtiandchill.com/pages/blog/gamestop-cautionary-tale.html \u2014 How the GameStop meme-stock frenzy actually played out for retail investors \u2014 narrative bias, social proof, diamond hands, and what VTI investors were doing instead.",
        "skill_md_entry": "**The GameStop Saga**: https://www.vtiandchill.com/pages/blog/gamestop-cautionary-tale.html \u2014 How the GameStop meme-stock frenzy actually played out for retail investors \u2014 narrative bias, social proof, diamond hands, and what VTI investors were doing instead.",
        "webmcp_entry": "{ title: 'The GameStop Saga', url: '/pages/blog/gamestop-cautionary-tale.html', tags: ['gamestop', 'gme', 'meme stocks', 'behavioral finance', 'retail investors', 'short squeeze', 'diamond hands', 'social proof', 'narrative bias', 'index investing'], description: 'How the GameStop meme-stock frenzy actually played out for retail investors \u2014 narrative bias, social proof, diamond hands, and what VTI investors were doing instead.' },",
    },
    # =========================================================================
    "fomo-expensive-emotion": {
        "date_iso": "2026-06-22",
        "date_human": "June 22, 2026",
        "section": "Behavioral Finance",
        "read_time": "6 min read",
        "title_short": "FOMO Is the Most Expensive Emotion in Investing",
        "card_title": "FOMO Is the Most Expensive Emotion in Investing",
        "card_blurb": "FOMO drives chase-buys at exactly the wrong time. Here is what fear of missing out actually costs investors \u2014 and the boring playbook that beats it.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**FOMO Is the Most Expensive Emotion in Investing**: https://www.vtiandchill.com/pages/blog/fomo-expensive-emotion.html \u2014 FOMO drives chase-buys at exactly the wrong time. Here is what fear of missing out actually costs investors \u2014 and the boring playbook that beats it.",
        "skill_md_entry": "**FOMO Is the Most Expensive Emotion in Investing**: https://www.vtiandchill.com/pages/blog/fomo-expensive-emotion.html \u2014 FOMO drives chase-buys at exactly the wrong time. Here is what fear of missing out actually costs investors \u2014 and the boring playbook that beats it.",
        "webmcp_entry": "{ title: 'FOMO Is the Most Expensive Emotion in Investing', url: '/pages/blog/fomo-expensive-emotion.html', tags: ['fomo investing', 'fear of missing out', 'behavioral finance', 'herding', 'chasing performance', 'market timing', 'dollar cost averaging', 'index funds'], description: 'FOMO drives chase-buys at exactly the wrong time. Here is what fear of missing out actually costs investors \u2014 and the boring playbook that beats it.' },",
    },
    # =========================================================================
    "brain-worst-advisor": {
        "date_iso": "2026-06-26",
        "date_human": "June 26, 2026",
        "section": "Behavioral Finance",
        "read_time": "7 min read",
        "title_short": "Why Your Brain Is Your Worst Investment Advisor",
        "card_title": "Why Your Brain Is Your Worst Investment Advisor",
        "card_blurb": "Loss aversion, recency bias, overconfidence \u2014 the cognitive biases that wreck portfolios, and how a passive index strategy short-circuits them all.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**Why Your Brain Is Your Worst Investment Advisor**: https://www.vtiandchill.com/pages/blog/brain-worst-advisor.html \u2014 Loss aversion, recency bias, overconfidence \u2014 the cognitive biases that wreck portfolios, and how a passive index strategy short-circuits them all.",
        "skill_md_entry": "**Why Your Brain Is Your Worst Investment Advisor**: https://www.vtiandchill.com/pages/blog/brain-worst-advisor.html \u2014 Loss aversion, recency bias, overconfidence \u2014 the cognitive biases that wreck portfolios, and how a passive index strategy short-circuits them all.",
        "webmcp_entry": "{ title: 'Why Your Brain Is Your Worst Investment Advisor', url: '/pages/blog/brain-worst-advisor.html', tags: ['behavioral finance', 'cognitive biases', 'loss aversion', 'recency bias', 'overconfidence', 'investor psychology', 'index investing', 'kahneman'], description: 'Loss aversion, recency bias, overconfidence \u2014 the cognitive biases that wreck portfolios, and how a passive index strategy short-circuits them all.' },",
    },
    # =========================================================================
    "dunning-kruger-investing": {
        "date_iso": "2026-06-29",
        "date_human": "June 29, 2026",
        "section": "Behavioral Finance",
        "read_time": "6 min read",
        "title_short": "The Dunning-Kruger Effect",
        "card_title": "The Dunning-Kruger Effect",
        "card_blurb": "The least-skilled investors are usually the most confident. Here is how the Dunning-Kruger effect plays out in markets \u2014 and why humility wins long-term.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**The Dunning-Kruger Effect: Why Beginners Think They Can Beat the Market**: https://www.vtiandchill.com/pages/blog/dunning-kruger-investing.html \u2014 The least-skilled investors are usually the most confident. Here is how the Dunning-Kruger effect plays out in markets \u2014 and why humility wins long-term.",
        "skill_md_entry": "**The Dunning-Kruger Effect**: https://www.vtiandchill.com/pages/blog/dunning-kruger-investing.html \u2014 The least-skilled investors are usually the most confident. Here is how the Dunning-Kruger effect plays out in markets \u2014 and why humility wins long-term.",
        "webmcp_entry": "{ title: 'The Dunning-Kruger Effect', url: '/pages/blog/dunning-kruger-investing.html', tags: ['dunning kruger', 'overconfidence', 'beat the market', 'active vs passive', 'behavioral finance', 'index funds', 'investor psychology'], description: 'The least-skilled investors are usually the most confident. Here is how the Dunning-Kruger effect plays out in markets \u2014 and why humility wins long-term.' },",
    },
    # =========================================================================
    "panic-selling": {
        "date_iso": "2026-07-03",
        "date_human": "July 3, 2026",
        "section": "Behavioral Finance",
        "read_time": "7 min read",
        "title_short": "Panic Selling",
        "card_title": "Panic Selling",
        "card_blurb": "Selling at the bottom is the most expensive mistake retail investors make. Here is what the data says \u2014 and the simple system that prevents it.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**Panic Selling: The Single Most Destructive Investor Behavior**: https://www.vtiandchill.com/pages/blog/panic-selling.html \u2014 Selling at the bottom is the most expensive mistake retail investors make. Here is what the data says \u2014 and the simple system that prevents it.",
        "skill_md_entry": "**Panic Selling**: https://www.vtiandchill.com/pages/blog/panic-selling.html \u2014 Selling at the bottom is the most expensive mistake retail investors make. Here is what the data says \u2014 and the simple system that prevents it.",
        "webmcp_entry": "{ title: 'Panic Selling', url: '/pages/blog/panic-selling.html', tags: ['panic selling', 'market crash', 'behavioral finance', 'dalbar', 'stay the course', 'dollar cost averaging', 'bear market'], description: 'Selling at the bottom is the most expensive mistake retail investors make. Here is what the data says \u2014 and the simple system that prevents it.' },",
    },
    # =========================================================================
    "crypto-meme-stocks-easy-money": {
        "date_iso": "2026-07-06",
        "date_human": "July 6, 2026",
        "section": "Behavioral Finance",
        "read_time": "7 min read",
        "title_short": "Crypto Bros, Meme Stocks, and the Eternal Search for Easy...",
        "card_title": "Crypto Bros, Meme Stocks, and the Eternal Search for Easy...",
        "card_blurb": "Every generation reinvents the get-rich-quick scheme. Crypto and meme stocks are the latest. Here is why the boring index fund still wins.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**Crypto Bros, Meme Stocks, and the Eternal Search for Easy Money**: https://www.vtiandchill.com/pages/blog/crypto-meme-stocks-easy-money.html \u2014 Every generation reinvents the get-rich-quick scheme. Crypto and meme stocks are the latest. Here is why the boring index fund still wins.",
        "skill_md_entry": "**Crypto Bros, Meme Stocks, and the Eternal Search for Easy...**: https://www.vtiandchill.com/pages/blog/crypto-meme-stocks-easy-money.html \u2014 Every generation reinvents the get-rich-quick scheme. Crypto and meme stocks are the latest. Here is why the boring index fund still wins.",
        "webmcp_entry": "{ title: 'Crypto Bros, Meme Stocks, and the Eternal Search for Easy...', url: '/pages/blog/crypto-meme-stocks-easy-money.html', tags: ['crypto', 'meme stocks', 'get rich quick', 'speculation', 'behavioral finance', 'index investing', 'retail investors', 'bitcoin', 'gambling'], description: 'Every generation reinvents the get-rich-quick scheme. Crypto and meme stocks are the latest. Here is why the boring index fund still wins.' },",
    },
    # =========================================================================
    "sunk-cost-fallacy": {
        "date_iso": "2026-07-10",
        "date_human": "July 10, 2026",
        "section": "Behavioral Finance",
        "read_time": "7 min read",
        "title_short": "The Sunk Cost Fallacy",
        "card_title": "The Sunk Cost Fallacy",
        "card_blurb": "Holding a losing stock because you already lost money on it is the sunk-cost fallacy. Here is how to tell the difference between cutting losses and diamond hands.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**The Sunk Cost Fallacy: When to Cut Losses (And When to Hold)**: https://www.vtiandchill.com/pages/blog/sunk-cost-fallacy.html \u2014 Holding a losing stock because you already lost money on it is the sunk-cost fallacy. Here is how to tell the difference between cutting losses and diamond hands.",
        "skill_md_entry": "**The Sunk Cost Fallacy**: https://www.vtiandchill.com/pages/blog/sunk-cost-fallacy.html \u2014 Holding a losing stock because you already lost money on it is the sunk-cost fallacy. Here is how to tell the difference between cutting losses and diamond hands.",
        "webmcp_entry": "{ title: 'The Sunk Cost Fallacy', url: '/pages/blog/sunk-cost-fallacy.html', tags: ['sunk cost fallacy', 'behavioral finance', 'cut losses', 'position sizing', 'rebalancing', 'individual stocks', 'index funds', 'loss aversion'], description: 'Holding a losing stock because you already lost money on it is the sunk-cost fallacy. Here is how to tell the difference between cutting losses and diamond hands.' },",
    },
    # =========================================================================
    "this-time-its-different": {
        "date_iso": "2026-07-13",
        "date_human": "July 13, 2026",
        "section": "Behavioral Finance",
        "read_time": "7 min read",
        "title_short": "This Time It's Different",
        "card_title": "This Time It's Different",
        "card_blurb": "Every bubble has the same justification: this time it is different. Here is why it almost never is \u2014 and how to invest accordingly.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #ff6b6b 100%)",
        "card_emoji": "\U0001f9e0",
        "sitemap_priority": "0.8",
        "llms_entry": "**This Time It's Different: The Four Most Expensive Words in Investing**: https://www.vtiandchill.com/pages/blog/this-time-its-different.html \u2014 Every bubble has the same justification: this time it is different. Here is why it almost never is \u2014 and how to invest accordingly.",
        "skill_md_entry": "**This Time It's Different**: https://www.vtiandchill.com/pages/blog/this-time-its-different.html \u2014 Every bubble has the same justification: this time it is different. Here is why it almost never is \u2014 and how to invest accordingly.",
        "webmcp_entry": "{ title: 'This Time It's Different', url: '/pages/blog/this-time-its-different.html', tags: ['this time is different', 'bubbles', 'dot com', 'ai bubble', 'behavioral finance', 'market history', 'john templeton', 'valuation'], description: 'Every bubble has the same justification: this time it is different. Here is why it almost never is \u2014 and how to invest accordingly.' },",
    },
    # =========================================================================
    "tax-loss-harvesting": {
        "date_iso": "2026-07-17",
        "date_human": "July 17, 2026",
        "section": "Tax Strategy",
        "read_time": "6 min read",
        "title_short": "Tax-Loss Harvesting",
        "card_title": "Tax-Loss Harvesting",
        "card_blurb": "Tax-loss harvesting converts paper losses into real tax savings. Here is the simple wash-sale-safe playbook for VTI/VOO investors.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001f4b0",
        "sitemap_priority": "0.8",
        "llms_entry": "**Tax-Loss Harvesting: How to Turn Market Drops Into Tax Savings**: https://www.vtiandchill.com/pages/blog/tax-loss-harvesting.html \u2014 Tax-loss harvesting converts paper losses into real tax savings. Here is the simple wash-sale-safe playbook for VTI/VOO investors.",
        "skill_md_entry": "**Tax-Loss Harvesting**: https://www.vtiandchill.com/pages/blog/tax-loss-harvesting.html \u2014 Tax-loss harvesting converts paper losses into real tax savings. Here is the simple wash-sale-safe playbook for VTI/VOO investors.",
        "webmcp_entry": "{ title: 'Tax-Loss Harvesting', url: '/pages/blog/tax-loss-harvesting.html', tags: ['tax loss harvesting', 'wash sale rule', 'vti', 'voo', 'taxable brokerage', 'capital gains', 'capital losses', 'etf tax strategy'], description: 'Tax-loss harvesting converts paper losses into real tax savings. Here is the simple wash-sale-safe playbook for VTI/VOO investors.' },",
    },
    # =========================================================================
    "roth-vs-traditional": {
        "date_iso": "2026-07-20",
        "date_human": "July 20, 2026",
        "section": "Retirement Planning",
        "read_time": "6 min read",
        "title_short": "Roth vs. Traditional",
        "card_title": "Roth vs. Traditional",
        "card_blurb": "Roth or traditional 401(k)/IRA? It is not about today's tax bracket vs. retirement's \u2014 here is the framework that actually works.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #f4d03f 100%)",
        "card_emoji": "\U0001f3d6",
        "sitemap_priority": "0.8",
        "llms_entry": "**Roth vs. Traditional: The Great Retirement Account Debate**: https://www.vtiandchill.com/pages/blog/roth-vs-traditional.html \u2014 Roth or traditional 401(k)/IRA? It is not about today's tax bracket vs. retirement's \u2014 here is the framework that actually works.",
        "skill_md_entry": "**Roth vs. Traditional**: https://www.vtiandchill.com/pages/blog/roth-vs-traditional.html \u2014 Roth or traditional 401(k)/IRA? It is not about today's tax bracket vs. retirement's \u2014 here is the framework that actually works.",
        "webmcp_entry": "{ title: 'Roth vs. Traditional', url: '/pages/blog/roth-vs-traditional.html', tags: ['roth ira', 'traditional 401k', 'retirement planning', 'tax brackets', 'rmd', 'backdoor roth', 'fire', 'retirement accounts'], description: 'Roth or traditional 401(k)/IRA? It is not about today s tax bracket vs. retirement s \u2014 here is the framework that actually works.' },",
    },
    # =========================================================================
    "coast-fire": {
        "date_iso": "2026-07-24",
        "date_human": "July 24, 2026",
        "section": "Retirement Planning",
        "read_time": "6 min read",
        "title_short": "The Coast FIRE Calculator",
        "card_title": "The Coast FIRE Calculator",
        "card_blurb": "Coast FIRE is the number where compounding takes over and you stop saving. Here is how it works, the formula, and the trade-offs nobody mentions.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #f4d03f 100%)",
        "card_emoji": "\U0001f3d6",
        "sitemap_priority": "0.8",
        "llms_entry": "**The Coast FIRE Calculator: How Much Do You Really Need to Save?**: https://www.vtiandchill.com/pages/blog/coast-fire.html \u2014 Coast FIRE is the number where compounding takes over and you stop saving. Here is how it works, the formula, and the trade-offs nobody mentions.",
        "skill_md_entry": "**The Coast FIRE Calculator**: https://www.vtiandchill.com/pages/blog/coast-fire.html \u2014 Coast FIRE is the number where compounding takes over and you stop saving. Here is how it works, the formula, and the trade-offs nobody mentions.",
        "webmcp_entry": "{ title: 'The Coast FIRE Calculator', url: '/pages/blog/coast-fire.html', tags: ['coast fire', 'financial independence', 'retire early', 'compounding', 'savings rate', 'retirement calculator', 'fire movement', 'vti'], description: 'Coast FIRE is the number where compounding takes over and you stop saving. Here is how it works, the formula, and the trade-offs nobody mentions.' },",
    },
    # =========================================================================
    "asset-location": {
        "date_iso": "2026-07-27",
        "date_human": "July 27, 2026",
        "section": "Tax Strategy",
        "read_time": "6 min read",
        "title_short": "Asset Location",
        "card_title": "Asset Location",
        "card_blurb": "Asset location decides which holdings go in your 401k, Roth, and taxable brokerage. Done right it can add up to 0.5% annually with zero added risk.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001f4b0",
        "sitemap_priority": "0.8",
        "llms_entry": "**Asset Location: The Tax Strategy That Can Add 0.5% Per Year**: https://www.vtiandchill.com/pages/blog/asset-location.html \u2014 Asset location decides which holdings go in your 401k, Roth, and taxable brokerage. Done right it can add up to 0.5% annually with zero added risk.",
        "skill_md_entry": "**Asset Location**: https://www.vtiandchill.com/pages/blog/asset-location.html \u2014 Asset location decides which holdings go in your 401k, Roth, and taxable brokerage. Done right it can add up to 0.5% annually with zero added risk.",
        "webmcp_entry": "{ title: 'Asset Location', url: '/pages/blog/asset-location.html', tags: ['asset location', 'tax efficient investing', 'bonds in 401k', 'reits in ira', 'etf taxation', 'tax drag', 'retirement accounts'], description: 'Asset location decides which holdings go in your 401k, Roth, and taxable brokerage. Done right it can add up to 0.5% annually with zero added risk.' },",
    },
    # =========================================================================
    "emergency-funds": {
        "date_iso": "2026-07-31",
        "date_human": "July 31, 2026",
        "section": "Personal Finance",
        "read_time": "7 min read",
        "title_short": "Emergency Funds",
        "card_title": "Emergency Funds",
        "card_blurb": "Three months, six months, or twelve? The right emergency fund depends on job stability, dependents, and risk tolerance. Here is the framework.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #5dade2 100%)",
        "card_emoji": "\U0001f4b5",
        "sitemap_priority": "0.8",
        "llms_entry": "**Emergency Funds: How Much Is Enough?**: https://www.vtiandchill.com/pages/blog/emergency-funds.html \u2014 Three months, six months, or twelve? The right emergency fund depends on job stability, dependents, and risk tolerance. Here is the framework.",
        "skill_md_entry": "**Emergency Funds**: https://www.vtiandchill.com/pages/blog/emergency-funds.html \u2014 Three months, six months, or twelve? The right emergency fund depends on job stability, dependents, and risk tolerance. Here is the framework.",
        "webmcp_entry": "{ title: 'Emergency Funds', url: '/pages/blog/emergency-funds.html', tags: ['emergency fund', 'high yield savings', 'hysa', 'cash reserves', 'personal finance', 'job loss', 'financial planning'], description: 'Three months, six months, or twelve? The right emergency fund depends on job stability, dependents, and risk tolerance. Here is the framework.' },",
    },
    # =========================================================================
    "true-cost-of-advisors": {
        "date_iso": "2026-08-03",
        "date_human": "August 3, 2026",
        "section": "Wall Street Critique",
        "read_time": "7 min read",
        "title_short": "The True Cost of Financial Advisors",
        "card_title": "The True Cost of Financial Advisors",
        "card_blurb": "A 1% advisor fee sounds small. Over 30 years compounded against your portfolio it is six-figure money. Here is the math and when an advisor is worth it.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #af7ac5 100%)",
        "card_emoji": "\U0001f3db",
        "sitemap_priority": "0.8",
        "llms_entry": "**The True Cost of Financial Advisors: What 1% Costs Over 30 Years**: https://www.vtiandchill.com/pages/blog/true-cost-of-advisors.html \u2014 A 1% advisor fee sounds small. Over 30 years compounded against your portfolio it is six-figure money. Here is the math and when an advisor is worth it.",
        "skill_md_entry": "**The True Cost of Financial Advisors**: https://www.vtiandchill.com/pages/blog/true-cost-of-advisors.html \u2014 A 1% advisor fee sounds small. Over 30 years compounded against your portfolio it is six-figure money. Here is the math and when an advisor is worth it.",
        "webmcp_entry": "{ title: 'The True Cost of Financial Advisors', url: '/pages/blog/true-cost-of-advisors.html', tags: ['financial advisor fees', 'aum fee', '1 percent fee', 'fiduciary', 'fee only advisor', 'robo advisor', 'index investing'], description: 'A 1% advisor fee sounds small. Over 30 years compounded against your portfolio it is six-figure money. Here is the math and when an advisor is worth it.' },",
    },
    # =========================================================================
    "sequence-of-returns-risk": {
        "date_iso": "2026-08-07",
        "date_human": "August 7, 2026",
        "section": "Retirement Planning",
        "read_time": "7 min read",
        "title_short": "Sequence of Returns Risk",
        "card_title": "Sequence of Returns Risk",
        "card_blurb": "A bad year early in retirement is exponentially worse than the same year later. Here is sequence of returns risk and the playbook that defuses it.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #f4d03f 100%)",
        "card_emoji": "\U0001f3d6",
        "sitemap_priority": "0.8",
        "llms_entry": "**Sequence of Returns Risk: The Retirement Danger Nobody Warns You About**: https://www.vtiandchill.com/pages/blog/sequence-of-returns-risk.html \u2014 A bad year early in retirement is exponentially worse than the same year later. Here is sequence of returns risk and the playbook that defuses it.",
        "skill_md_entry": "**Sequence of Returns Risk**: https://www.vtiandchill.com/pages/blog/sequence-of-returns-risk.html \u2014 A bad year early in retirement is exponentially worse than the same year later. Here is sequence of returns risk and the playbook that defuses it.",
        "webmcp_entry": "{ title: 'Sequence of Returns Risk', url: '/pages/blog/sequence-of-returns-risk.html', tags: ['sequence of returns risk', 'retirement risk', 'four percent rule', 'bond tent', 'withdrawal rate', 'safe withdrawal', 'retirement planning'], description: 'A bad year early in retirement is exponentially worse than the same year later. Here is sequence of returns risk and the playbook that defuses it.' },",
    },
    # =========================================================================
    "fire-movement-explained": {
        "date_iso": "2026-08-10",
        "date_human": "August 10, 2026",
        "section": "Retirement Planning",
        "read_time": "7 min read",
        "title_short": "The FIRE Movement Explained",
        "card_title": "The FIRE Movement Explained",
        "card_blurb": "FIRE is not one path \u2014 it is Lean, Fat, Barista, Coast, and a few others. Here is the honest breakdown of who fits which flavor and what the math requires.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #f4d03f 100%)",
        "card_emoji": "\U0001f3d6",
        "sitemap_priority": "0.8",
        "llms_entry": "**The FIRE Movement Explained: Financial Independence, Retire Early**: https://www.vtiandchill.com/pages/blog/fire-movement-explained.html \u2014 FIRE is not one path \u2014 it is Lean, Fat, Barista, Coast, and a few others. Here is the honest breakdown of who fits which flavor and what the math requires.",
        "skill_md_entry": "**The FIRE Movement Explained**: https://www.vtiandchill.com/pages/blog/fire-movement-explained.html \u2014 FIRE is not one path \u2014 it is Lean, Fat, Barista, Coast, and a few others. Here is the honest breakdown of who fits which flavor and what the math requires.",
        "webmcp_entry": "{ title: 'The FIRE Movement Explained', url: '/pages/blog/fire-movement-explained.html', tags: ['fire movement', 'financial independence', 'retire early', 'lean fire', 'fat fire', 'barista fire', 'coast fire', 'savings rate'], description: 'FIRE is not one path \u2014 it is Lean, Fat, Barista, Coast, and a few others. Here is the honest breakdown of who fits which flavor and what the math requires.' },",
    },
    # =========================================================================
    "talk-to-partner-about-money": {
        "date_iso": "2026-08-14",
        "date_human": "August 14, 2026",
        "section": "Personal Finance",
        "read_time": "7 min read",
        "title_short": "How to Talk to Your Partner About Money (Without Starting...",
        "card_title": "How to Talk to Your Partner About Money (Without Starting...",
        "card_blurb": "Money fights are about values, not numbers. Here is the conversation framework that actually works \u2014 shared goals, separate styles, no shame.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #5dade2 100%)",
        "card_emoji": "\U0001f4b5",
        "sitemap_priority": "0.8",
        "llms_entry": "**How to Talk to Your Partner About Money (Without Starting a War)**: https://www.vtiandchill.com/pages/blog/talk-to-partner-about-money.html \u2014 Money fights are about values, not numbers. Here is the conversation framework that actually works \u2014 shared goals, separate styles, no shame.",
        "skill_md_entry": "**How to Talk to Your Partner About Money (Without Starting...**: https://www.vtiandchill.com/pages/blog/talk-to-partner-about-money.html \u2014 Money fights are about values, not numbers. Here is the conversation framework that actually works \u2014 shared goals, separate styles, no shame.",
        "webmcp_entry": "{ title: 'How to Talk to Your Partner About Money (Without Starting...', url: '/pages/blog/talk-to-partner-about-money.html', tags: ['couples and money', 'money conversations', 'financial partner', 'joint finances', 'household budget', 'communication', 'relationship money'], description: 'Money fights are about values, not numbers. Here is the conversation framework that actually works \u2014 shared goals, separate styles, no shame.' },",
    },
    # =========================================================================
    "backdoor-roth": {
        "date_iso": "2026-08-17",
        "date_human": "August 17, 2026",
        "section": "Tax Strategy",
        "read_time": "6 min read",
        "title_short": "The Backdoor Roth IRA",
        "card_title": "The Backdoor Roth IRA",
        "card_blurb": "Income too high for direct Roth contributions? The backdoor Roth converts after-tax money into a Roth IRA. Here is the step-by-step playbook.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001f4b0",
        "sitemap_priority": "0.8",
        "llms_entry": "**The Backdoor Roth IRA: A Legal Loophole Every High Earner Should Know**: https://www.vtiandchill.com/pages/blog/backdoor-roth.html \u2014 Income too high for direct Roth contributions? The backdoor Roth converts after-tax money into a Roth IRA. Here is the step-by-step playbook.",
        "skill_md_entry": "**The Backdoor Roth IRA**: https://www.vtiandchill.com/pages/blog/backdoor-roth.html \u2014 Income too high for direct Roth contributions? The backdoor Roth converts after-tax money into a Roth IRA. Here is the step-by-step playbook.",
        "webmcp_entry": "{ title: 'The Backdoor Roth IRA', url: '/pages/blog/backdoor-roth.html', tags: ['backdoor roth ira', 'mega backdoor roth', 'roth conversion', 'high income roth', 'traditional ira nondeductible', 'pro rata rule'], description: 'Income too high for direct Roth contributions? The backdoor Roth converts after-tax money into a Roth IRA. Here is the step-by-step playbook.' },",
    },
    # =========================================================================
    "hsa-triple-tax": {
        "date_iso": "2026-08-21",
        "date_human": "August 21, 2026",
        "section": "Tax Strategy",
        "read_time": "6 min read",
        "title_short": "HSA",
        "card_title": "HSA",
        "card_blurb": "Health Savings Accounts are the only account with three tax breaks. Used as a stealth retirement account, the HSA beats almost every alternative.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001f4b0",
        "sitemap_priority": "0.8",
        "llms_entry": "**HSA: The Triple Tax-Advantaged Account Nobody Talks About**: https://www.vtiandchill.com/pages/blog/hsa-triple-tax.html \u2014 Health Savings Accounts are the only account with three tax breaks. Used as a stealth retirement account, the HSA beats almost every alternative.",
        "skill_md_entry": "**HSA**: https://www.vtiandchill.com/pages/blog/hsa-triple-tax.html \u2014 Health Savings Accounts are the only account with three tax breaks. Used as a stealth retirement account, the HSA beats almost every alternative.",
        "webmcp_entry": "{ title: 'HSA', url: '/pages/blog/hsa-triple-tax.html', tags: ['hsa', 'health savings account', 'triple tax advantage', 'hdhp', 'retirement healthcare', 'medical expenses', 'tax free growth'], description: 'Health Savings Accounts are the only account with three tax breaks. Used as a stealth retirement account, the HSA beats almost every alternative.' },",
    },
    # =========================================================================
    "401k-ripping-you-off": {
        "date_iso": "2026-08-24",
        "date_human": "August 24, 2026",
        "section": "Wall Street Critique",
        "read_time": "7 min read",
        "title_short": "Your 401(k) Is Probably Ripping You Off (Here's How to Fi...",
        "card_title": "Your 401(k) Is Probably Ripping You Off (Here's How to Fi...",
        "card_blurb": "Hidden 401(k) fees can drain hundreds of thousands over a career. Here is how to read your plan, find the fee leaks, and fix them.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #af7ac5 100%)",
        "card_emoji": "\U0001f3db",
        "sitemap_priority": "0.8",
        "llms_entry": "**Your 401(k) Is Probably Ripping You Off (Here's How to Fix It)**: https://www.vtiandchill.com/pages/blog/401k-ripping-you-off.html \u2014 Hidden 401(k) fees can drain hundreds of thousands over a career. Here is how to read your plan, find the fee leaks, and fix them.",
        "skill_md_entry": "**Your 401(k) Is Probably Ripping You Off (Here's How to Fi...**: https://www.vtiandchill.com/pages/blog/401k-ripping-you-off.html \u2014 Hidden 401(k) fees can drain hundreds of thousands over a career. Here is how to read your plan, find the fee leaks, and fix them.",
        "webmcp_entry": "{ title: 'Your 401(k) Is Probably Ripping You Off (Here's How to Fi...', url: '/pages/blog/401k-ripping-you-off.html', tags: ['401k fees', 'expense ratio', '408b2 disclosure', 'fund fees', 'retirement plan fees', 'target date funds', 'employer match'], description: 'Hidden 401(k) fees can drain hundreds of thousands over a career. Here is how to read your plan, find the fee leaks, and fix them.' },",
    },
    # =========================================================================
    # =========================================================================
    "when-the-multiple-flinched": {
        "date_iso": "2026-06-10",
        "date_human": "June 10, 2026",
        "section": "Market Commentary",
        "read_time": "6 min read",
        "title_short": "When the Multiple Flinched",
        "card_title": "When the Multiple Flinched",
        "card_blurb": "The AI Class trailing P/E dropped 6.6 turns in a week to 44.7x \u2014 right onto the 39x AI Class of 2026 benchmark line. Breadth held at 77%, but top-5 concentration ticked up to 64.0%.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F4C9",
        "sitemap_priority": "0.85",
        "llms_entry": "**When the Multiple Flinched**: https://www.vtiandchill.com/pages/blog/when-the-multiple-flinched.html \u2014 AI Class median trailing P/E compressed 6.6 turns in one week (51.3x \u2192 44.7x), forward P/E 23.6x \u2192 21.3x, sitting on the 39x AI Class of 2026 benchmark line; positive FY1 EPS coverage held at 77% (27 of 35 names); top-5 concentration rose 61.8% \u2192 64.0% (NVDA, GOOGL, MSFT, AMZN, TSM); contrasts with 1999 setup where breadth narrowed first; bubble test requires P/E expanding AND EPS revisions stalling \u2014 neither is happening; practical playbook: keep DCAing, use 5/25 rebalance bands, do not chase concentrated AI names; includes copy-and-go Google Sheets P/E monitor link",
        "skill_md_entry": "**When the Multiple Flinched**: https://www.vtiandchill.com/pages/blog/when-the-multiple-flinched.html \u2014 6.6-turn trailing P/E compression (51.3x \u2192 44.7x) lands the AI Class right on the 39x benchmark; breadth held at 77%, but top-5 concentration ticked up to 64.0%; the bubble test (P/E expanding AND EPS revisions stalling) still fails; rebalance-band playbook for long-term VTI holders",
        "webmcp_entry": "{ title: 'When the Multiple Flinched', url: '/pages/blog/when-the-multiple-flinched.html', tags: ['AI Class basket', 'multiple compression', 'forward P/E', 'breadth', 'concentration', 'rebalancing', 'market commentary'], description: 'The AI Class trailing P/E dropped 6.6 turns in a week to 44.7x. Breadth held, but concentration ticked up \u2014 here is what that pattern means and what to do.' },",
    },
    # =========================================================================
    "how-1999-actually-looked": {
        "date_iso": "2026-06-03",
        "date_human": "June 3, 2026",
        "section": "Market Commentary",
        "read_time": "7 min read",
        "title_short": "How 1999 Actually Looked",
        "card_title": "How 1999 Actually Looked",
        "card_blurb": "The AI Class trailing P/E jumped 9 turns in a week to 51.3x \u2014 a new monitor high. The 1999 chart overlays look compelling until you check what was in the denominator.",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F4C9",
        "sitemap_priority": "0.85",
        "llms_entry": "**How 1999 Actually Looked**: https://www.vtiandchill.com/pages/blog/how-1999-actually-looked.html \u2014 AI Class median trailing P/E hit 51.3x this week (highest monitor reading, up 9 turns in 7 days) with forward at 23.6x; contrasts with 1999 dot-com darlings 152x peak; key difference is denominator \u2014 1999 darlings had shrinking earnings while 2026 IT sector posted 29.1% Q1 net profit margin per FactSet, highest since 2009; 77% of 35-name basket has positive forward EPS; references JPMorgan Cembalest COVIDIA analysis on NVIDIA data-center capex at 15% of all market capex (only IBM 1969 and Cisco/Lucent/Nortel 2000 prior parallels), Sequoia's $600B capex vs $100B revenue gap; concludes capex digestion is the real risk, not multiple compression to 1999 levels; includes copy-and-go Google Sheets P/E monitor link",
        "skill_md_entry": "**How 1999 Actually Looked**: https://www.vtiandchill.com/pages/blog/how-1999-actually-looked.html \u2014 AI Class trailing P/E hit 51.3x (new high, up 9 turns in a week) vs. 1999 dot-com darlings 152x peak; denominator is the key difference \u2014 IT sector at 29.1% margins (FactSet all-time high) vs. collapsing 1999 earnings; Cembalest COVIDIA capex concentration analysis; 77% basket positive forward EPS",
        "webmcp_entry": "{ title: 'How 1999 Actually Looked', url: '/pages/blog/how-1999-actually-looked.html', tags: ['AI bubble', '1999 dot-com', 'valuation', 'forward P/E', 'market commentary', 'capex'], description: 'AI Class trailing P/E hit a monitor high of 51.3x \u2014 here is how the 1999 dot-com darlings actually compared on earnings, margins, and capex, and why the chart overlays are getting the wrong lesson.' },",
    },
    # =========================================================================
    "earnings-revisions-matter-more-than-earnings": {
        "date_iso": "2026-05-20",
        "date_human": "May 20, 2026",
        "section": "Market Commentary",
        "read_time": "6 min read",
        "title_short": "Why Earnings Revisions Matter More Than Earnings",
        "card_title": "Why Earnings Revisions Matter More Than Earnings",
        "card_blurb": "A 14.6-point Q1 2026 revision \u2014 2x the 10-year norm \u2014 explains the entire gap between the AI Class\u2019s 39.9x trailing and 21.9x forward P/E. The bear case has shifted from \u2018multiples look high\u2019 to \u2018revisions have to reverse.\u2019",
        "card_gradient": "linear-gradient(135deg, #1a1a2e 0%, #00d4aa 100%)",
        "card_emoji": "\U0001F4C8",
        "sitemap_priority": "0.85",
        "llms_entry": "**Why Earnings Revisions Matter More Than Earnings**: https://www.vtiandchill.com/pages/blog/earnings-revisions-matter-more-than-earnings.html \u2014 Post explains how earnings revisions, not absolute earnings, drive forward P/E and multiple compression; uses Q1 2026 FactSet data showing 14.6-point quarter-end-to-season-end EPS growth-rate revision vs. 5.8-point 10-year average; bottom-up S&P 500 EPS estimate jumped $72 to $80.29 in 14 days; companies beating by 18.2% vs. 7.3% 5-year norm; contrasts AI Class basket at 39.9x trailing / 21.9x forward with dot-com peak of 152x trailing on Evercore ISI darlings; cites FactSet May 8 update, Barron\u2019s, multpl.com; three revision regimes (normal, deteriorating, accelerating); argues bear case has shifted from \u2018trailing P/E too high\u2019 to \u2018revisions must reverse\u2019",
        "skill_md_entry": "**Why Earnings Revisions Matter More Than Earnings**: https://www.vtiandchill.com/pages/blog/earnings-revisions-matter-more-than-earnings.html \u2014 Q1 2026 FactSet data showing 14.6-point earnings revision (2x 10-yr norm) drives the AI Class\u2019s 39.9x trailing / 21.9x forward P/E gap; why revisions matter more than beats; dot-com comparison; practical framework for long-term VTI investors",
        "webmcp_entry": "{ title: 'Why Earnings Revisions Matter More Than Earnings', url: '/pages/blog/earnings-revisions-matter-more-than-earnings.html', tags: ['earnings revisions', 'forward P/E', 'AI Class basket', 'FactSet', 'S&P 500', 'EPS', 'multiple compression', 'dot-com bubble', 'valuation', 'market commentary'], description: 'A 14.6-point Q1 2026 earnings revision running 2x the 10-year norm explains the entire gap between the AI Class\u2019s 39.9x trailing and 21.9x forward P/E \u2014 and shifts the bear case from multiples to revisions.' },",
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
