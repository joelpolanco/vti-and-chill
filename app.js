/* ===== VTI & CHILL — Main JavaScript ===== */

// Theme toggle
(function(){
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  if (t) {
    updateToggleIcon(t, d);
    t.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      t.setAttribute('aria-label', 'Switch to ' + (d === 'dark' ? 'light' : 'dark') + ' mode');
      updateToggleIcon(t, d);
      // Re-render charts if they exist
      if (typeof renderCharts === 'function') renderCharts();
    });
  }
  function updateToggleIcon(btn, theme) {
    const icon = btn.querySelector('[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      lucide.createIcons();
    }
  }
})();

// Header scroll effect
(function(){
  const header = document.getElementById('siteHeader');
  if (!header) return;
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('site-header--scrolled', y > 20);
    lastScroll = y;
  }, { passive: true });
})();

// Animated counter
(function(){
  const el = document.getElementById('growthValue');
  if (!el) return;
  // VTI inception ~June 2001, $10K invested. Approximate growth to ~$75K by March 2026
  const target = 75400;
  const duration = 2000;
  const start = performance.now();
  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = '$' + current.toLocaleString();
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
});

// Mini growth chart on homepage
function renderCharts() {
  const ctx = document.getElementById('miniGrowthChart');
  if (!ctx) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches);

  const textColor = isDark ? '#8b949e' : '#6c757d';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Simulated S&P 500 growth from 2001-2026 for $10K
  const years = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26'];
  const values = [10000,8800,6800,7500,9700,10800,12500,14000,8900,7100,9200,9500,11000,14500,16500,16700,18700,22800,21700,25600,22100,32000,26600,32200,37800,42500];

  if (window._miniChart) window._miniChart.destroy();

  window._miniChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years.map(y => "'" + y),
      datasets: [{
        label: '$10K in S&P 500',
        data: values,
        borderColor: '#00d4aa',
        backgroundColor: isDark ? 'rgba(0,212,170,0.08)' : 'rgba(0,212,170,0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1c2333' : '#1a1a2e',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.8)',
          borderColor: 'rgba(0,212,170,0.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => '$' + ctx.parsed.y.toLocaleString()
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 10 }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: v => '$' + (v/1000) + 'K'
          }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', renderCharts);

// ========== PORTFOLIO BUILDER ==========
function initPortfolioBuilder() {
  const tabs = document.querySelectorAll('.builder-tab');
  const contents = document.querySelectorAll('.builder-content');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add('active');
      renderPieCharts();
    });
  });

  renderPieCharts();
}

function renderPieCharts() {
  // Good tier pie
  // 1-Fund tier pie — check toggle state
  const oneFundToggle = document.getElementById('oneFundToggle');
  const isGlobal = oneFundToggle && oneFundToggle.classList.contains('active');
  if (isGlobal) {
    renderPie('pieGood', [
      { label: 'Total World (VT)', value: 100, color: '#00d4aa' },
    ]);
  } else {
    renderPie('pieGood', [
      { label: 'US Total Market (VTI)', value: 100, color: '#00d4aa' },
    ]);
  }

  // Better tier pie — check toggle state
  const betterToggle = document.getElementById('betterToggle');
  const isWorldwide = betterToggle && betterToggle.classList.contains('active');
  if (isWorldwide) {
    renderPie('pieBetter', [
      { label: 'US LC Blend (AVLC)', value: 25, color: '#00d4aa' },
      { label: 'US SC Value (AVSC)', value: 25, color: '#0f3460' },
      { label: "Int'l LC Blend (AVDE)", value: 25, color: '#e8af34' },
      { label: "Int'l SC Value (AVDV)", value: 25, color: '#00b894' },
    ]);
  } else {
    renderPie('pieBetter', [
      { label: 'US LC Blend (AVUS)', value: 25, color: '#00d4aa' },
      { label: 'US SC Blend (AVSC)', value: 25, color: '#0f3460' },
      { label: 'US LC Value (AVLV)', value: 25, color: '#e8af34' },
      { label: 'US SC Value (AVUV)', value: 25, color: '#00b894' },
    ]);
  }

  // Best tier pie — check toggle state
  const bestToggle = document.getElementById('bestToggle');
  const is5050 = bestToggle && bestToggle.classList.contains('active');
  if (is5050) {
    renderPie('pieBest', [
      { label: 'US LC Blend (AVUS)', value: 10, color: '#00d4aa' },
      { label: 'US LC Value (AVLV)', value: 10, color: '#0f3460' },
      { label: 'US SC Blend (AVSC)', value: 10, color: '#e8af34' },
      { label: 'US SC Value (AVUV)', value: 10, color: '#00b894' },
      { label: "Int'l LC Blend (AVDE)", value: 10, color: '#4f98a3' },
      { label: "Int'l LC Value (DFIV)", value: 10, color: '#a84b2f' },
      { label: "Int'l SC Blend (AVDS)", value: 10, color: '#944454' },
      { label: "Int'l SC Value (AVDV)", value: 10, color: '#6e522b' },
      { label: 'REITs (VNQ)', value: 10, color: '#848456' },
      { label: 'EM (AVEM)', value: 10, color: '#1b474d' },
    ]);
  } else {
    renderPie('pieBest', [
      { label: 'US LC Blend (AVUS)', value: 14, color: '#00d4aa' },
      { label: 'US LC Value (AVLV)', value: 14, color: '#0f3460' },
      { label: 'US SC Blend (AVSC)', value: 14, color: '#e8af34' },
      { label: 'US SC Value (AVUV)', value: 14, color: '#00b894' },
      { label: 'US REITs (VNQ)', value: 14, color: '#848456' },
      { label: "Int'l LC Blend (AVDE)", value: 6, color: '#4f98a3' },
      { label: "Int'l LC Value (DFIV)", value: 6, color: '#a84b2f' },
      { label: "Int'l SC Blend (AVDS)", value: 6, color: '#944454' },
      { label: "Int'l SC Value (AVDV)", value: 6, color: '#6e522b' },
      { label: 'EM (AVEM)', value: 6, color: '#1b474d' },
    ]);
  }
}

function renderPie(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (window['_pie_' + canvasId]) window['_pie_' + canvasId].destroy();

  window['_pie_' + canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.color),
        borderWidth: 2,
        borderColor: isDark ? '#161b22' : '#ffffff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDark ? '#8b949e' : '#6c757d',
            font: { size: 11 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 8,
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1c2333' : '#1a1a2e',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.8)',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ctx.label + ': ' + ctx.parsed + '%'
          }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', initPortfolioBuilder);

// ========== COMPOUND INTEREST CALCULATOR ==========
function flashResult(el) {
  if (!el) return;
  el.style.transition = 'color 0.15s ease';
  const original = el.style.color;
  el.style.color = '#00d4aa';
  setTimeout(() => { el.style.color = original; }, 200);
}

function initCompoundCalc() {
  const form = document.getElementById('compoundForm');
  if (!form) return;

  const inputs = form.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('input', calculateCompound);
    input.addEventListener('change', calculateCompound);
  });
  calculateCompound();
}

function readNum(id, fallback) {
  const raw = document.getElementById(id)?.value;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}
function readInt(id, fallback) {
  const raw = document.getElementById(id)?.value;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function calculateCompound() {
  const initial = Math.max(0, readNum('calcInitial', 0));
  const monthly = Math.max(0, readNum('calcMonthly', 0));
  const rate = Math.max(0, readNum('calcRate', 10) / 100);
  const years = Math.max(1, readInt('calcYears', 30));

  const monthlyRate = rate / 12;
  const months = years * 12;

  let total;
  if (monthlyRate === 0) {
    // No growth: just initial + all contributions
    total = initial + monthly * months;
  } else {
    total = initial * Math.pow(1 + monthlyRate, months);
    total += monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }

  const contributed = initial + (monthly * months);
  const growth = total - contributed;

  const resultEl = document.getElementById('compoundResult');
  const contribEl = document.getElementById('compoundContributed');
  const growthEl = document.getElementById('compoundGrowth');

  if (resultEl) { resultEl.textContent = '$' + Math.round(total).toLocaleString(); flashResult(resultEl); }
  if (contribEl) contribEl.textContent = '$' + Math.round(contributed).toLocaleString();
  if (growthEl) growthEl.textContent = '$' + Math.round(growth).toLocaleString();

  renderCompoundChart(years, initial, monthly, rate);
}

function renderCompoundChart(years, initial, monthly, rate) {
  const ctx = document.getElementById('compoundChart');
  if (!ctx) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#8b949e' : '#6c757d';

  const labels = [];
  const balances = [];
  const contributions = [];
  const monthlyRate = rate / 12;

  for (let y = 0; y <= years; y++) {
    labels.push('Year ' + y);
    const months = y * 12;
    let bal = initial * Math.pow(1 + monthlyRate, months);
    bal += monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    balances.push(Math.round(bal));
    contributions.push(Math.round(initial + monthly * months));
  }

  if (window._compChart) window._compChart.destroy();

  window._compChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Value',
          data: balances,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0,212,170,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Contributions',
          data: contributions,
          borderColor: isDark ? '#6e7681' : '#adb5bd',
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          pointRadius: 0,
          borderWidth: 1.5,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor, font: { size: 11 }, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: isDark ? '#1c2333' : '#1a1a2e',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.8)',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString()
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: v => v >= 1000000 ? '$' + (v/1000000).toFixed(1) + 'M' : '$' + (v/1000) + 'K'
          }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', initCompoundCalc);

// ========== COAST FIRE CALCULATOR ==========
function initCoastCalc() {
  const form = document.getElementById('coastForm');
  if (!form) return;

  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', calculateCoast);
    input.addEventListener('change', calculateCoast);
  });
  calculateCoast();
}

function calculateCoast() {
  const currentAge = readInt('coastAge', 30);
  const currentSavings = Math.max(0, readNum('coastSavings', 0));
  const retireAge = readInt('coastRetireAge', 65);
  const fireNumber = Math.max(0, readNum('coastTarget', 0));
  const growthRate = 0.10; // 10% historical

  const resultEl = document.getElementById('coastResult');
  const statusEl = document.getElementById('coastStatus');

  const yearsToRetire = retireAge - currentAge;

  if (yearsToRetire <= 0) {
    if (resultEl) { resultEl.textContent = '$' + Math.round(fireNumber).toLocaleString(); flashResult(resultEl); }
    if (statusEl) {
      statusEl.textContent = 'Your retirement age must be greater than your current age. When you\'re already at (or past) your target date, your Coast number equals your full FIRE number.';
      statusEl.style.color = '';
    }
    return;
  }

  const coastNumber = fireNumber / Math.pow(1 + growthRate, yearsToRetire);

  if (resultEl) { resultEl.textContent = '$' + Math.round(coastNumber).toLocaleString(); flashResult(resultEl); }
  if (statusEl) {
    if (currentSavings >= coastNumber) {
      const surplus = currentSavings - coastNumber;
      statusEl.textContent = 'You\'ve hit Coast FIRE with $' + Math.round(surplus).toLocaleString() + ' to spare. Your invested savings should compound to your FIRE number by age ' + retireAge + ' without another dollar contributed.';
      statusEl.style.color = '#00d4aa';
    } else {
      const gap = coastNumber - currentSavings;
      statusEl.textContent = 'You need $' + Math.round(gap).toLocaleString() + ' more invested to hit Coast FIRE. Once you cross that line, compounding alone gets you to $' + Math.round(fireNumber).toLocaleString() + ' by age ' + retireAge + '.';
      statusEl.style.color = '';
    }
  }
}

document.addEventListener('DOMContentLoaded', initCoastCalc);

// ========== RETIREMENT CALCULATOR ==========
function initRetireCalc() {
  const form = document.getElementById('retireForm');
  if (!form) return;

  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', calculateRetire);
    input.addEventListener('change', calculateRetire);
  });
  calculateRetire();
}

function calculateRetire() {
  const currentAge = readInt('retireAge', 30);
  const savings = Math.max(0, readNum('retireSavings', 0));
  const monthlyContrib = Math.max(0, readNum('retireMonthly', 0));
  const annualExpenses = Math.max(1, readNum('retireExpenses', 50000));
  const rate = 0.10;
  const swr = 0.04; // 4% safe withdrawal

  const fireNumber = annualExpenses / swr;
  const monthlyRate = rate / 12;

  const resultEl = document.getElementById('retireResult');
  const detailEl = document.getElementById('retireDetail');

  // Handle case where already retired
  if (savings >= fireNumber) {
    if (resultEl) { resultEl.textContent = '0 years'; flashResult(resultEl); }
    if (detailEl) detailEl.textContent = 'You can already retire. Your savings of $' + Math.round(savings).toLocaleString() + ' exceed your FIRE number of $' + Math.round(fireNumber).toLocaleString() + '.';
    return;
  }

  let balance = savings;
  let months = 0;
  const maxMonths = 720; // 60 years max

  // If no growth AND no contribution, will never hit target
  if (monthlyContrib === 0 && monthlyRate === 0) {
    if (resultEl) { resultEl.textContent = 'Never'; flashResult(resultEl); }
    if (detailEl) detailEl.textContent = 'With zero contributions and zero growth, savings will never reach $' + Math.round(fireNumber).toLocaleString() + '.';
    return;
  }

  while (balance < fireNumber && months < maxMonths) {
    balance = balance * (1 + monthlyRate) + monthlyContrib;
    months++;
  }

  const yearsToFire = months / 12;
  const fireAge = currentAge + yearsToFire;

  if (resultEl) {
    if (months >= maxMonths) {
      resultEl.textContent = '60+ years';
    } else {
      resultEl.textContent = yearsToFire.toFixed(1) + ' years';
    }
    flashResult(resultEl);
  }
  if (detailEl) {
    if (months >= maxMonths) {
      detailEl.textContent = 'At this savings rate, you won\'t hit $' + Math.round(fireNumber).toLocaleString() + ' in 60 years. Increase monthly contributions or lower target expenses.';
    } else {
      detailEl.textContent = 'FIRE number: $' + Math.round(fireNumber).toLocaleString() + ' (reached at age ' + Math.round(fireAge) + ')';
    }
  }
}

document.addEventListener('DOMContentLoaded', initRetireCalc);

// ========== TOGGLE GROUPS ==========
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const labels = toggle.parentElement.querySelectorAll('.toggle-label');
      labels.forEach(l => l.classList.toggle('active'));

      // Handle 1-Fund toggle
      if (toggle.id === 'oneFundToggle') {
        const isGlobal = toggle.classList.contains('active');
        document.getElementById('oneFundClass').textContent = isGlobal ? 'Total World Stock Market' : 'US Total Stock Market';
        document.getElementById('oneFundTicker').textContent = isGlobal ? 'VT' : 'VTI';
        document.getElementById('oneFundExpense').textContent = isGlobal ? '0.07%' : '0.03%';
        document.getElementById('oneFundCAGR').textContent = isGlobal ? '~8.2%' : '~10.0%';
        document.getElementById('oneFundDrawdown').textContent = isGlobal ? '-50%' : '-55%';
        document.getElementById('oneFundExpenseRatio').textContent = isGlobal ? '0.07%' : '0.03%';
        document.getElementById('oneFundHoldings').textContent = isGlobal ? '~9,700' : '~3,500';
        document.getElementById('oneFundDesc').textContent = isGlobal
          ? 'One fund, the entire world. VT holds nearly 10,000 stocks across the US, developed markets, and emerging economies. If you want true global diversification in a single ticker, this is it. You own a piece of every publicly traded company on the planet \u2014 for less than a cup of coffee per year in fees.'
          : 'The heart of VTI & Chill. One fund, the entire US stock market, zero complexity. Buy it, hold it, live your life. JL Collins built an entire investing philosophy around this single idea \u2014 and the data backs him up. Over the last two decades, owning the total market has beaten the vast majority of actively managed funds.';
        renderPieCharts();
      }

      // Handle 4-Fund toggle (US Only ↔ Worldwide)
      if (toggle.id === 'betterToggle') {
        const isWW = toggle.classList.contains('active');
        const table = document.getElementById('betterTable');
        if (table) {
          const tbody = table.querySelector('tbody');
          if (isWW) {
            tbody.innerHTML =
              '<tr><td>US Large-Cap Blend</td><td class="ticker">AVLC</td><td>25%</td><td>0.15%</td></tr>' +
              '<tr><td>US Small-Cap Value</td><td class="ticker">AVSC</td><td>25%</td><td>0.25%</td></tr>' +
              '<tr><td>Int\'l Large-Cap Blend</td><td class="ticker">AVDE</td><td>25%</td><td>0.23%</td></tr>' +
              '<tr><td>Int\'l Small-Cap Value</td><td class="ticker">AVDV</td><td>25%</td><td>0.36%</td></tr>';
          } else {
            tbody.innerHTML =
              '<tr><td>US Large-Cap Blend</td><td class="ticker">AVUS</td><td>25%</td><td>0.15%</td></tr>' +
              '<tr><td>US Small-Cap Blend</td><td class="ticker">AVSC</td><td>25%</td><td>0.25%</td></tr>' +
              '<tr><td>US Large-Cap Value</td><td class="ticker">AVLV</td><td>25%</td><td>0.15%</td></tr>' +
              '<tr><td>US Small-Cap Value</td><td class="ticker">AVUV</td><td>25%</td><td>0.25%</td></tr>';
          }
        }
        // Update description
        const betterDesc = document.getElementById('betterDesc');
        if (betterDesc) {
          betterDesc.textContent = isWW
            ? 'Four funds spanning US and international markets. A simple way to get worldwide equity exposure with a small-cap value tilt on both sides of the globe.'
            : 'Four funds covering the key US equity factors. Delivers returns nearly identical to the 10-fund portfolio with simpler management.';
        }
        // Update stats
        const statsContainer = toggle.closest('.builder-content')?.querySelector('.comparison-stats');
        if (statsContainer) {
          const values = statsContainer.querySelectorAll('.comp-value');
          if (isWW) {
            if (values[0]) values[0].textContent = '~10.8%';
            if (values[1]) values[1].textContent = '-54%';
            if (values[2]) values[2].textContent = '0.25%';
          } else {
            if (values[0]) values[0].textContent = '~12.5%';
            if (values[1]) values[1].textContent = '-52%';
            if (values[2]) values[2].textContent = '0.20%';
          }
        }
        renderPieCharts();
      }

      // Handle 10-Fund toggle (70/30 ↔ 50/50 US/Int'l)
      if (toggle.id === 'bestToggle') {
        const is5050 = toggle.classList.contains('active');
        const table = document.getElementById('bestTable');
        if (table) {
          const tbody = table.querySelector('tbody');
          if (is5050) {
            tbody.innerHTML =
              '<tr><td>US Large-Cap Blend</td><td class="ticker">AVUS</td><td>10%</td><td>0.15%</td></tr>' +
              '<tr><td>US Large-Cap Value</td><td class="ticker">AVLV</td><td>10%</td><td>0.15%</td></tr>' +
              '<tr><td>US Small-Cap Blend</td><td class="ticker">AVSC</td><td>10%</td><td>0.25%</td></tr>' +
              '<tr><td>US Small-Cap Value</td><td class="ticker">AVUV</td><td>10%</td><td>0.25%</td></tr>' +
              '<tr><td>US REITs</td><td class="ticker">VNQ</td><td>10%</td><td>0.12%</td></tr>' +
              '<tr><td>Int\'l Large-Cap Blend</td><td class="ticker">AVDE</td><td>10%</td><td>0.23%</td></tr>' +
              '<tr><td>Int\'l Large-Cap Value</td><td class="ticker">DFIV</td><td>10%</td><td>0.27%</td></tr>' +
              '<tr><td>Int\'l Small-Cap Blend</td><td class="ticker">AVDS</td><td>10%</td><td>0.36%</td></tr>' +
              '<tr><td>Int\'l Small-Cap Value</td><td class="ticker">AVDV</td><td>10%</td><td>0.36%</td></tr>' +
              '<tr><td>Emerging Markets</td><td class="ticker">AVEM</td><td>10%</td><td>0.33%</td></tr>';
          } else {
            tbody.innerHTML =
              '<tr><td>US Large-Cap Blend</td><td class="ticker">AVUS</td><td>14%</td><td>0.15%</td></tr>' +
              '<tr><td>US Large-Cap Value</td><td class="ticker">AVLV</td><td>14%</td><td>0.15%</td></tr>' +
              '<tr><td>US Small-Cap Blend</td><td class="ticker">AVSC</td><td>14%</td><td>0.25%</td></tr>' +
              '<tr><td>US Small-Cap Value</td><td class="ticker">AVUV</td><td>14%</td><td>0.25%</td></tr>' +
              '<tr><td>US REITs</td><td class="ticker">VNQ</td><td>14%</td><td>0.12%</td></tr>' +
              '<tr><td>Int\'l Large-Cap Blend</td><td class="ticker">AVDE</td><td>6%</td><td>0.23%</td></tr>' +
              '<tr><td>Int\'l Large-Cap Value</td><td class="ticker">DFIV</td><td>6%</td><td>0.27%</td></tr>' +
              '<tr><td>Int\'l Small-Cap Blend</td><td class="ticker">AVDS</td><td>6%</td><td>0.36%</td></tr>' +
              '<tr><td>Int\'l Small-Cap Value</td><td class="ticker">AVDV</td><td>6%</td><td>0.36%</td></tr>' +
              '<tr><td>Emerging Markets</td><td class="ticker">AVEM</td><td>6%</td><td>0.33%</td></tr>';
          }
        }
        // Update stats
        const statsContainer = toggle.closest('.builder-content')?.querySelector('.comparison-stats');
        if (statsContainer) {
          const values = statsContainer.querySelectorAll('.comp-value');
          if (is5050) {
            if (values[0]) values[0].textContent = '~12.0%';
            if (values[1]) values[1].textContent = '-50%';
            if (values[2]) values[2].textContent = '0.27%';
            if (values[3]) values[3].textContent = '~12,000';
          } else {
            if (values[0]) values[0].textContent = '~13.2%';
            if (values[1]) values[1].textContent = '-48%';
            if (values[2]) values[2].textContent = '0.26%';
            if (values[3]) values[3].textContent = '~12,000';
          }
        }
        renderPieCharts();
      }
    });
  });
});

// Responsive media query handler for 2-column layout
(function(){
  if (window.innerWidth <= 768) {
    const gridEl = document.querySelector('[style*="grid-template-columns: 1fr 1fr"]');
    // handled by CSS
  }
})();
