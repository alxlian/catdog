import * as d3 from 'd3';
import { toTitleCase } from './utils.js';

const PALETTE = ['#EB5E28', '#3B7EA1', '#D4960A', '#7B6D4E', '#9C4D8B'];

export function renderNamesPage(namesData) {
  const toggleContainer = document.getElementById('names-species-toggle');
  const leaderboard = document.getElementById('names-leaderboard');
  const trendChart = document.getElementById('name-trend-chart');
  const trendLegend = document.getElementById('name-trend-legend');
  const dogExclusive = document.getElementById('dog-exclusive');
  const catExclusive = document.getElementById('cat-exclusive');
  const crossover = document.getElementById('crossover-names');

  if (!leaderboard) return;

  let currentSpecies = 'DOG';

  function render() {
    const data = namesData[currentSpecies] || {};
    renderLeaderboard(leaderboard, data);
    renderTrendChart(trendChart, trendLegend, data);
    renderExclusives(dogExclusive, catExclusive, namesData);
    renderCrossover(crossover, namesData);
  }

  toggleContainer?.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleContainer.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpecies = btn.dataset.value;
      render();
    });
  });

  render();
}

function getLatestYear(data) {
  let latest = 0;
  for (const entries of Object.values(data)) {
    for (const e of entries) {
      if (e.year > latest) latest = e.year;
    }
  }
  return latest;
}

function renderLeaderboard(container, data) {
  // All-time totals
  const all = Object.entries(data).map(([name, entries]) => ({
    name,
    total: entries.reduce((s, e) => s + e.count, 0),
    entries,
  }));
  all.sort((a, b) => b.total - a.total);

  const display = all.slice(0, 20);

  if (!display.length) {
    container.innerHTML = '<p style="color:var(--gray);font-size:13px">No matching names found.</p>';
    return;
  }

  const maxCount = display[0].total;

  container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem">
    ${display.map((d, i) => {
      return `<div style="background:white;border:1px solid var(--gray-light);border-radius:0.75rem;padding:0.4rem 0.5rem;display:flex;align-items:center;gap:0.5rem">
        <span style="font-size:0.625rem;font-weight:600;color:var(--gray);min-width:1rem;text-align:right">${i + 1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.8125rem;font-weight:600;color:var(--text);line-height:1.2">${toTitleCase(d.name)}</div>
          <div style="font-size:0.5625rem;color:var(--gray)">${d.total.toLocaleString()}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderTrendChart(container, legendContainer, data) {
  if (!container) return;
  container.innerHTML = '';
  if (legendContainer) legendContainer.innerHTML = '';

  const latestYear = getLatestYear(data);
  const all = [];
  for (const [name, entries] of Object.entries(data)) {
    const latest = entries.find(e => e.year === latestYear);
    if (latest) all.push({ name, rank: latest.rank, entries });
  }
  all.sort((a, b) => a.rank - b.rank);
  const top5 = all.slice(0, 5);

  if (!top5.length) return;

  const margin = { top: 36, right: 80, bottom: 36, left: 40 };
  const width = 560;
  const height = 220;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const allEntries = top5.flatMap(d => d.entries);
  const years = [...new Set(allEntries.map(e => e.year))].sort();

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([d3.max(allEntries, e => e.rank) + 1, 1])
    .range([innerH, 0]);
  const color = d3.scaleOrdinal(PALETTE);
  const maxRank = d3.max(allEntries, e => e.rank);
  const yTicks = [1, ...y.ticks(4).filter(t => t !== 1)];

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('font-family', "'Gantari', system-ui, sans-serif")
    .style('overflow', 'visible')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Gridlines
  svg.append('g')
    .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-innerW).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').attr('stroke', '#E8E4DA').attr('stroke-dasharray', '3 3'));

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format('d')).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick text').attr('dy', '1em').attr('fill', '#403D39').attr('font-size', '10px'));

  // Y axis (rank — inverted so #1 is at top)
  svg.append('g')
    .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d => '#' + d).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick text').attr('dx', '-0.5em').attr('fill', '#403D39').attr('font-size', '10px'));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.rank))
    .curve(d3.curveMonotoneX);

  top5.forEach((breed, i) => {
    const entries = breed.entries;
    const lastEntry = entries[entries.length - 1];

    svg.append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', color(i))
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    svg.append('circle')
      .attr('cx', x(lastEntry.year))
      .attr('cy', y(lastEntry.rank))
      .attr('r', 4)
      .attr('fill', color(i))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    svg.append('text')
      .attr('x', x(lastEntry.year) + 8)
      .attr('y', y(lastEntry.rank))
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', color(i))
      .text(toTitleCase(breed.name));
  });

  // Legend
  if (legendContainer) {
    top5.forEach((d, i) => {
      const item = document.createElement('span');
      item.style.cssText = 'display:inline-flex;align-items:center;gap:4px;color:#403D39;';
      item.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${color(i)};display:inline-block"></span>${toTitleCase(d.name)}`;
      legendContainer.appendChild(item);
    });
  }
}

function renderExclusives(dogEl, catEl, namesData) {
  if (!dogEl || !catEl) return;

  const dogNames = namesData.DOG || {};
  const catNames = namesData.CAT || {};

  // Dog-only names (not found in cat data at all)
  const dogOnly = Object.entries(dogNames)
    .filter(([name]) => !catNames[name])
    .map(([name, entries]) => ({ name, total: entries.reduce((s, e) => s + e.count, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Cat-only names
  const catOnly = Object.entries(catNames)
    .filter(([name]) => !dogNames[name])
    .map(([name, entries]) => ({ name, total: entries.reduce((s, e) => s + e.count, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  dogEl.innerHTML = renderExclusiveList(dogOnly, '#EB5E28');
  catEl.innerHTML = renderExclusiveList(catOnly, '#3B7EA1');
}

function renderExclusiveList(items, color) {
  if (!items.length) return '<p style="color:var(--gray);font-size:12px">No exclusive names found.</p>';
  const max = items[0].total;
  return items.map(d => {
    const barW = Math.max(6, (d.total / max) * 100);
    return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0">
      <span style="font-size:0.8125rem;font-weight:500;color:var(--text);width:5.5rem">${toTitleCase(d.name)}</span>
      <div style="flex:1;height:4px;background:#f5f0e8;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${barW}%;background:${color};border-radius:2px"></div>
      </div>
      <span style="font-size:0.6875rem;color:var(--gray);font-variant-numeric:tabular-nums;flex-shrink:0">${d.total.toLocaleString()}</span>
    </div>`;
  }).join('');
}

function renderCrossover(container, namesData) {
  if (!container) return;

  const dogNames = namesData.DOG || {};
  const catNames = namesData.CAT || {};

  // Total registrations per species (for computing share)
  const allDogCount = Object.values(dogNames).reduce((s, entries) => s + entries.reduce((a, e) => a + e.count, 0), 0);
  const allCatCount = Object.values(catNames).reduce((s, entries) => s + entries.reduce((a, e) => a + e.count, 0), 0);

  const shared = Object.keys(dogNames)
    .filter(n => catNames[n])
    .map(n => {
      const dogTotal = dogNames[n].reduce((s, e) => s + e.count, 0);
      const catTotal = catNames[n].reduce((s, e) => s + e.count, 0);
      const dogPct = (dogTotal / allDogCount) * 100;
      const catPct = (catTotal / allCatCount) * 100;
      return { name: n, dogPct, catPct, total: dogTotal + catTotal };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  if (!shared.length) {
    container.innerHTML = '<p style="color:var(--gray);font-size:12px">No shared names found.</p>';
    return;
  }

  container.innerHTML = `<div style="display:flex;justify-content:flex-end;gap:1.5rem;padding-bottom:0.375rem;border-bottom:1px solid #f5f0e8;margin-bottom:0.25rem">
    <span style="font-size:0.625rem;font-weight:500;color:#EB5E28;width:3.5rem;text-align:right">Dogs</span>
    <span style="font-size:0.625rem;font-weight:500;color:#3B7EA1;width:3.5rem;text-align:right">Cats</span>
  </div>` + shared.map(d => {
    return `<div style="display:flex;align-items:center;padding:0.375rem 0;border-bottom:1px solid #f5f0e8">
      <span style="font-size:0.8125rem;font-weight:500;color:var(--text);flex:1">${toTitleCase(d.name)}</span>
      <span style="font-size:0.8125rem;font-weight:600;color:#EB5E28;width:3.5rem;text-align:right">${d.dogPct.toFixed(1)}%</span>
      <span style="font-size:0.8125rem;font-weight:600;color:#3B7EA1;width:3.5rem;text-align:right">${d.catPct.toFixed(1)}%</span>
    </div>`;
  }).join('');
}
