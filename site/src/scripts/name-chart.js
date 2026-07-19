import * as d3 from 'd3';
import { toTitleCase } from './utils.js';

export function renderNames(namesData) {
  const toggleContainer = document.getElementById('names-species-toggle');
  const searchInput = document.getElementById('name-search');
  const leaderboard = document.getElementById('names-leaderboard');

  if (!leaderboard) return;

  let currentSpecies = 'DOG';

  function render() {
    const data = namesData[currentSpecies] || {};
    const searchTerm = searchInput?.value?.toUpperCase() || '';
    renderLeaderboard(leaderboard, data, searchTerm);
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

  searchInput?.addEventListener('input', () => render());

  render();
}

function renderLeaderboard(container, data, searchTerm) {
  // Find latest year
  let latestYear = 0;
  for (const entries of Object.values(data)) {
    for (const e of entries) {
      if (e.year > latestYear) latestYear = e.year;
    }
  }

  // Get top names by rank in latest year
  const all = [];
  for (const [name, entries] of Object.entries(data)) {
    const latest = entries.find(e => e.year === latestYear);
    if (latest) {
      all.push({ name, rank: latest.rank, count: latest.count, entries });
    }
  }
  all.sort((a, b) => a.rank - b.rank);

  // Filter by search
  let display = all;
  if (searchTerm) {
    display = all.filter(d => d.name.includes(searchTerm));
  }
  display = display.slice(0, 20);

  if (!display.length) {
    container.innerHTML = '<p style="color:var(--gray)">No matching names found.</p>';
    return;
  }

  // Build sparklines with LOCAL y-scale per name (better trend visibility)
  const allYears = [...new Set(display.flatMap(d => d.entries.map(e => e.year)))].sort();

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
          <tr style="border-bottom:1px solid var(--gray-light)">
            <td style="padding:0.375rem 0;color:var(--gray)">${d.rank}</td>
            <td style="padding:0.375rem 0;font-weight:500">${toTitleCase(d.name)}</td>
            <td style="padding:0.375rem 0;text-align:right;font-variant-numeric:tabular-nums">${d.count.toLocaleString()}</td>
            <td style="padding:0.375rem 0"><svg class="sparkline" data-name="${d.name}" viewBox="0 0 80 20" style="width:5rem;height:1.25rem"></svg></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Draw sparklines with per-name local scale
  const x = d3.scaleLinear().domain(d3.extent(allYears)).range([2, 78]);

  container.querySelectorAll('.sparkline').forEach(svgEl => {
    const name = svgEl.dataset.name;
    const entries = data[name];
    if (!entries || entries.length < 2) return;

    // Local y-scale: just this name's rank range
    const ranks = entries.map(e => e.rank);
    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    // Add padding so flat lines aren't invisible
    const padding = maxRank === minRank ? 2 : 0;
    const y = d3.scaleLinear().domain([maxRank + padding, minRank - padding]).range([18, 2]);
    const line = d3.line().x(d => x(d.year)).y(d => y(d.rank));

    d3.select(svgEl)
      .append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', '#6B7280')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  });
}
