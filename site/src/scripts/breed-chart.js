import * as d3 from 'd3';

export function renderBreedTrends(breedTrends) {
  const speciesToggle = document.getElementById('breed-species-toggle');
  const searchInput = document.getElementById('breed-search');
  const chartContainer = document.getElementById('breed-line-chart');
  const risingContainer = document.getElementById('rising-breeds');
  const decliningContainer = document.getElementById('declining-breeds');

  if (!chartContainer) return;

  let currentSpecies = 'DOG';
  let searchTerm = '';

  function render() {
    const data = breedTrends[currentSpecies] || {};
    renderLineChart(chartContainer, data, searchTerm);
    renderRisingDeclining(risingContainer, decliningContainer, data);
  }

  speciesToggle?.addEventListener('change', (e) => {
    currentSpecies = e.target.value;
    render();
  });

  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toUpperCase();
    render();
  });

  render();
}

function renderLineChart(container, data, searchTerm) {
  container.innerHTML = '';

  // Filter breeds by search, show top 10 by latest count if no search
  let breeds = Object.keys(data);
  if (searchTerm) {
    breeds = breeds.filter(b => b.includes(searchTerm));
  }

  // Sort by latest year count
  breeds.sort((a, b) => {
    const aLast = data[a][data[a].length - 1]?.count || 0;
    const bLast = data[b][data[b].length - 1]?.count || 0;
    return bLast - aLast;
  });

  const displayBreeds = breeds.slice(0, 10);
  if (!displayBreeds.length) {
    container.innerHTML = '<p style="color:var(--gray)">No matching breeds found.</p>';
    return;
  }

  const margin = { top: 20, right: 120, bottom: 30, left: 50 };
  const width = 700;
  const height = 300;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const allEntries = displayBreeds.flatMap(b => data[b]);
  const years = [...new Set(allEntries.map(e => e.year))].sort();

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(allEntries, e => e.count)])
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
    .call(d3.axisLeft(y).ticks(5))
    .attr('font-size', '0.75rem');

  const line = d3.line().x(d => x(d.year)).y(d => y(d.count));

  displayBreeds.forEach((breed, i) => {
    const entries = data[breed];
    svg.append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', color(i))
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Label at end of line
    const last = entries[entries.length - 1];
    svg.append('text')
      .attr('x', x(last.year) + 4)
      .attr('y', y(last.count))
      .attr('font-size', '0.625rem')
      .attr('fill', color(i))
      .attr('dominant-baseline', 'middle')
      .text(breed);
  });
}

function renderRisingDeclining(risingEl, decliningEl, data) {
  if (!risingEl || !decliningEl) return;

  // Compute latest YoY change for each breed
  const changes = [];
  for (const [breed, entries] of Object.entries(data)) {
    const last = entries[entries.length - 1];
    if (last?.yoy_change != null) {
      changes.push({ breed, change: last.yoy_change, count: last.count });
    }
  }

  // Filter to breeds with meaningful counts (>10 latest year)
  const meaningful = changes.filter(c => c.count > 10);
  meaningful.sort((a, b) => b.change - a.change);

  const rising = meaningful.slice(0, 5);
  const declining = meaningful.slice(-5).reverse();

  risingEl.innerHTML = renderBarList(rising, 'var(--red)');
  decliningEl.innerHTML = renderBarList(declining, 'var(--blue)');
}

function renderBarList(items, color) {
  if (!items.length) return '<p style="color:var(--gray)">Not enough data</p>';
  const maxAbs = Math.max(...items.map(i => Math.abs(i.change)));
  return items.map(item => {
    const pct = (item.change * 100).toFixed(2);
    const barWidth = Math.abs(item.change) / maxAbs * 100;
    const sign = item.change >= 0 ? '+' : '';
    return `<div style="margin-bottom:0.5rem">
      <div style="display:flex;justify-content:space-between;font-size:0.8125rem">
        <span>${item.breed}</span><span>${sign}${pct}%</span>
      </div>
      <div style="height:6px;background:var(--gray-light);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${barWidth}%;background:${color};border-radius:3px"></div>
      </div>
    </div>`;
  }).join('');
}
