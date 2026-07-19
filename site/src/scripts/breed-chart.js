import * as d3 from 'd3';
import { toTitleCase } from './utils.js';

export function renderBreedTrends(breedTrends) {
  const toggleContainer = document.getElementById('breed-species-toggle');
  const searchInput = document.getElementById('breed-search');
  const chartContainer = document.getElementById('breed-line-chart');
  const legendContainer = document.getElementById('breed-legend');
  const risingContainer = document.getElementById('rising-breeds');
  const decliningContainer = document.getElementById('declining-breeds');

  if (!chartContainer) return;

  let currentSpecies = 'DOG';
  let searchTerm = '';

  function render() {
    const data = breedTrends[currentSpecies] || {};
    renderLineChart(chartContainer, legendContainer, data, searchTerm);
    renderRisingDeclining(risingContainer, decliningContainer, data);
  }

  // Toggle switch handler
  toggleContainer?.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleContainer.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpecies = btn.dataset.value;
      render();
    });
  });

  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toUpperCase();
    render();
  });

  render();
}

function renderLineChart(container, legendContainer, data, searchTerm) {
  container.innerHTML = '';
  if (legendContainer) legendContainer.innerHTML = '';

  let breeds = Object.keys(data);
  if (searchTerm) {
    breeds = breeds.filter(b => b.includes(searchTerm));
  }

  // Sort by latest year share
  breeds.sort((a, b) => {
    const aLast = data[a][data[a].length - 1]?.share || 0;
    const bLast = data[b][data[b].length - 1]?.share || 0;
    return bLast - aLast;
  });

  const displayBreeds = breeds.slice(0, 10);
  if (!displayBreeds.length) {
    container.innerHTML = '<p style="color:var(--gray)">No matching breeds found.</p>';
    return;
  }

  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 700;
  const height = 320;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const allEntries = displayBreeds.flatMap(b => data[b]);
  const years = [...new Set(allEntries.map(e => e.year))].sort();

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(allEntries, e => e.share) * 100])
    .nice()
    .range([innerH, 0]);
  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Axes
  svg.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format('d')))
    .attr('font-size', '0.75rem');
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
    .attr('font-size', '0.75rem');

  // Y axis label
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2).attr('y', -38)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.6875rem')
    .attr('fill', '#6B7280')
    .text('% Share of Licenses');

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.share * 100))
    .curve(d3.curveMonotoneX);

  displayBreeds.forEach((breed, i) => {
    const entries = data[breed];
    const lastEntry = entries[entries.length - 1];
    const isRising = lastEntry?.yoy_change >= 0;

    svg.append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', color(i))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', isRising ? 'none' : '6 3')
      .attr('d', line);

    // Dots on data points
    svg.selectAll(null)
      .data(entries)
      .join('circle')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.share * 100))
      .attr('r', 3)
      .attr('fill', color(i));
  });

  // Legend below chart
  if (legendContainer) {
    displayBreeds.forEach((breed, i) => {
      const item = document.createElement('span');
      item.style.display = 'inline-flex';
      item.style.alignItems = 'center';
      item.style.gap = '0.375rem';
      item.innerHTML = `<span style="width:12px;height:3px;background:${color(i)};border-radius:2px;display:inline-block"></span>${toTitleCase(breed)}`;
      legendContainer.appendChild(item);
    });
  }
}

function renderRisingDeclining(risingEl, decliningEl, data) {
  if (!risingEl || !decliningEl) return;

  const changes = [];
  for (const [breed, entries] of Object.entries(data)) {
    const last = entries[entries.length - 1];
    if (last?.yoy_change != null) {
      changes.push({ breed, change: last.yoy_change, count: last.count, entries });
    }
  }

  const meaningful = changes.filter(c => c.count > 10);
  meaningful.sort((a, b) => b.change - a.change);

  const rising = meaningful.slice(0, 5);
  const declining = meaningful.slice(-5).reverse();

  risingEl.innerHTML = renderTrendList(rising, 'var(--red)');
  decliningEl.innerHTML = renderTrendList(declining, 'var(--blue)');
}

function renderTrendList(items, color) {
  if (!items.length) return '<p style="color:var(--gray)">Not enough data</p>';

  return items.map(item => {
    const pct = (item.change * 100).toFixed(2);
    const sign = item.change >= 0 ? '+' : '';

    // Sparkline from share entries
    const shares = item.entries.map(e => e.share * 100);
    const min = Math.min(...shares);
    const max = Math.max(...shares);
    const range = max - min || 1;
    const points = shares.map((s, i) => {
      const x = (i / (shares.length - 1)) * 60;
      const y = 20 - ((s - min) / range) * 18;
      return `${x},${y}`;
    }).join(' ');

    return `<div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.75rem">
      <svg viewBox="0 0 60 22" style="width:3.75rem;height:1.375rem;flex-shrink:0">
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;font-size:0.8125rem">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${toTitleCase(item.breed)}</span>
          <span style="font-weight:600;flex-shrink:0;margin-left:0.5rem">${sign}${pct}%</span>
        </div>
      </div>
    </div>`;
  }).join('');
}
