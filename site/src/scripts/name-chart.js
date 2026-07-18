import * as d3 from 'd3';

export function renderNames(namesData) {
  const speciesToggle = document.getElementById('names-species-toggle');
  const searchInput = document.getElementById('name-search');
  const leaderboard = document.getElementById('names-leaderboard');
  const bumpChart = document.getElementById('name-bump-chart');

  if (!leaderboard) return;

  let currentSpecies = 'DOG';
  let selectedName = null;

  function render() {
    const data = namesData[currentSpecies] || {};
    renderLeaderboard(leaderboard, data, (name) => {
      selectedName = name;
      renderBumpChart(bumpChart, data, name);
    });
    if (selectedName && data[selectedName]) {
      renderBumpChart(bumpChart, data, selectedName);
    } else {
      bumpChart.innerHTML = '<p style="color:var(--gray);font-size:0.875rem">Click a name to see its rank over time.</p>';
    }
  }

  speciesToggle?.addEventListener('change', (e) => {
    currentSpecies = e.target.value;
    selectedName = null;
    render();
  });

  searchInput?.addEventListener('input', (e) => {
    const term = e.target.value.toUpperCase();
    if (!term) return;
    const speciesData = namesData[currentSpecies] || {};
    // Partial match — find first name containing the search term
    const match = Object.keys(speciesData).find(n => n.includes(term));
    if (match) {
      selectedName = match;
      renderBumpChart(bumpChart, speciesData, match);
    }
  });

  render();
}

function renderLeaderboard(container, data, onNameClick) {
  // Find latest year
  let latestYear = 0;
  for (const entries of Object.values(data)) {
    for (const e of entries) {
      if (e.year > latestYear) latestYear = e.year;
    }
  }

  // Get top 20 by rank in latest year
  const top20 = [];
  for (const [name, entries] of Object.entries(data)) {
    const latest = entries.find(e => e.year === latestYear);
    if (latest) {
      top20.push({ name, rank: latest.rank, count: latest.count, entries });
    }
  }
  top20.sort((a, b) => a.rank - b.rank);
  const display = top20.slice(0, 20);

  // Build sparklines inline
  const allYears = [...new Set(display.flatMap(d => d.entries.map(e => e.year)))].sort();
  const maxRank = Math.max(...display.flatMap(d => d.entries.map(e => e.rank)));

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:2px solid var(--gray-light)">
          <th style="text-align:left;padding:0.5rem 0;width:2rem">#</th>
          <th style="text-align:left;padding:0.5rem 0">Name</th>
          <th style="text-align:right;padding:0.5rem 0;width:4rem">Count</th>
          <th style="width:6rem;padding:0.5rem 0">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${display.map(d => `
          <tr style="border-bottom:1px solid var(--gray-light);cursor:pointer" data-name="${d.name}">
            <td style="padding:0.375rem 0;color:var(--gray)">${d.rank}</td>
            <td style="padding:0.375rem 0;font-weight:500">${d.name}</td>
            <td style="padding:0.375rem 0;text-align:right;font-variant-numeric:tabular-nums">${d.count.toLocaleString()}</td>
            <td style="padding:0.375rem 0"><svg class="sparkline" data-name="${d.name}" viewBox="0 0 80 20" style="width:5rem;height:1.25rem"></svg></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Add click handlers
  container.querySelectorAll('tr[data-name]').forEach(tr => {
    tr.addEventListener('click', () => onNameClick(tr.dataset.name));
  });

  // Draw sparklines
  const x = d3.scaleLinear().domain(d3.extent(allYears)).range([2, 78]);
  const y = d3.scaleLinear().domain([maxRank, 1]).range([18, 2]);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.rank));

  container.querySelectorAll('.sparkline').forEach(svgEl => {
    const name = svgEl.dataset.name;
    const entries = data[name];
    if (!entries) return;
    d3.select(svgEl)
      .append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', '#6B7280')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  });
}

function renderBumpChart(container, data, selectedName) {
  if (!container) return;
  container.innerHTML = '';

  const entries = data[selectedName];
  if (!entries?.length) {
    container.innerHTML = '<p style="color:var(--gray);font-size:0.875rem">Name not found.</p>';
    return;
  }

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 350;
  const height = 250;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain(d3.extent(entries, e => e.year)).range([0, innerW]);
  const y = d3.scaleLinear().domain([d3.max(entries, e => e.rank), 1]).range([innerH, 0]);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Title
  svg.append('text')
    .attr('x', innerW / 2)
    .attr('y', -6)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.875rem')
    .attr('font-weight', '600')
    .attr('fill', '#1A2B4A')
    .text(selectedName);

  // Axes
  svg.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(entries.length).tickFormat(d3.format('d')))
    .attr('font-size', '0.75rem');
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .attr('font-size', '0.75rem');

  // Y axis label
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2).attr('y', -28)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.6875rem')
    .attr('fill', '#6B7280')
    .text('Rank');

  // Line + dots
  const line = d3.line().x(d => x(d.year)).y(d => y(d.rank));
  svg.append('path')
    .datum(entries)
    .attr('fill', 'none')
    .attr('stroke', '#1A2B4A')
    .attr('stroke-width', 2)
    .attr('d', line);

  svg.selectAll('circle')
    .data(entries)
    .join('circle')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d.rank))
    .attr('r', 4)
    .attr('fill', '#1A2B4A');
}
