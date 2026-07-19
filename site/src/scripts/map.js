import * as d3 from 'd3';
import { toTitleCase } from './utils.js';

export function renderMap(mapSelector, tooltipSelector, sidebarSelector, geoData, fsaSummary) {
  const container = document.querySelector(mapSelector);
  const tooltip = document.querySelector(tooltipSelector);
  const sidebar = document.querySelector(sidebarSelector);
  if (!container) return;

  const width = 768;
  const height = 600;
  let currentMode = 'ratio';
  let currentSpecies = 'DOG';

  // Color scales
  const ratioScale = d3.scaleDiverging()
    .domain([0.3, 0.5, 0.8])
    .interpolator(d3.interpolateRdBu)
    .clamp(true);

  const densityScale = d3.scaleSequential()
    .interpolator(d3.interpolateYlOrRd);

  // Compute density range
  const perCapitaValues = Object.values(fsaSummary)
    .map(d => d.per_capita_rate)
    .filter(v => v != null);
  densityScale.domain([0, d3.max(perCapitaValues)]);

  function getColor(fsa) {
    const d = fsaSummary[fsa];
    if (!d) return '#E5E7EB';

    if (currentMode === 'ratio') {
      return ratioScale(1 - d.dog_ratio);
    } else if (currentMode === 'density') {
      return d.per_capita_rate != null ? densityScale(d.per_capita_rate) : '#E5E7EB';
    } else {
      // common / signature — use species color
      return currentSpecies === 'DOG' ? '#C41E3A22' : '#3B7EA122';
    }
  }

  const features = geoData.type === 'Topology' ? [] : geoData.features;
  if (!features.length) return;

  const projection = d3.geoMercator().fitSize([width, height], geoData);
  const path = d3.geoPath(projection);

  const svg = d3.select(mapSelector)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const paths = svg.selectAll('path')
    .data(features)
    .join('path')
    .attr('d', path)
    .attr('stroke', '#1A2B4A')
    .attr('stroke-width', 0.5);

  function updateFills() {
    paths.attr('fill', d => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      return getColor(fsa);
    });
    updateLegend();
  }

  // Hover — minimal tooltip showing top breed
  paths
    .on('mouseenter', (event, d) => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      const data = fsaSummary[fsa];
      if (!data) return;
      d3.select(event.currentTarget).attr('stroke-width', 2).attr('opacity', 0.85);

      // Minimal tooltip: just neighbourhood + top breed
      const topBreed = data.top_breeds?.[currentSpecies]?.[0];
      const breedText = topBreed ? toTitleCase(topBreed.breed) : 'N/A';
      if (tooltip) {
        tooltip.innerHTML = `<strong>${data.neighbourhood}</strong><br/>Top ${currentSpecies === 'DOG' ? 'dog' : 'cat'} breed: ${breedText}`;
        tooltip.style.display = 'block';
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
        tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
      }

      // Full detail in sidebar
      showSidebar(fsa, data);
    })
    .on('mousemove', (event) => {
      if (tooltip) {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
        tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
      }
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).attr('stroke-width', 0.5).attr('opacity', 1);
      if (tooltip) tooltip.style.display = 'none';
    });

  function showSidebar(fsa, data) {
    if (!sidebar) return;

    const topBreeds = (species) => {
      const breeds = data.top_breeds?.[species] || [];
      return breeds.map(b => `<li>${toTitleCase(b.breed)} <span style="color:var(--gray)">(${b.count})</span></li>`).join('');
    };
    const rareBreeds = (species) => {
      const breeds = data.rare_breeds?.[species] || [];
      return breeds.map(b => `<li>${toTitleCase(b.breed)} <span style="color:var(--gray)">(${b.count})</span></li>`).join('');
    };
    const sig = (species) => {
      const s = data.signature_breed?.[species];
      return s ? `${toTitleCase(s.breed)} <span style="color:var(--gray)">(${s.ratio}x city avg)</span>` : 'None';
    };
    const perCapita = data.per_capita_rate
      ? (data.per_capita_rate * 1000).toFixed(1) + ' per 1,000 residents'
      : 'N/A';

    sidebar.innerHTML = `
      <h3 style="margin-bottom:0.25rem">${data.neighbourhood}</h3>
      <p style="color:var(--gray);margin-bottom:1rem;font-size:0.75rem">${fsa}</p>

      <div style="display:flex;gap:1rem;margin-bottom:1rem">
        <div style="flex:1;text-align:center;padding:0.5rem;background:var(--bg);border-radius:0.375rem">
          <div style="font-size:1.25rem;font-weight:700;color:var(--red)">${data.dog_count}</div>
          <div style="font-size:0.6875rem;color:var(--gray)">Dogs</div>
        </div>
        <div style="flex:1;text-align:center;padding:0.5rem;background:var(--bg);border-radius:0.375rem">
          <div style="font-size:1.25rem;font-weight:700;color:var(--blue)">${data.cat_count}</div>
          <div style="font-size:0.6875rem;color:var(--gray)">Cats</div>
        </div>
      </div>

      <div style="margin-bottom:0.75rem">
        <strong style="font-size:0.75rem;text-transform:uppercase;color:var(--gray);letter-spacing:0.03em">Top Dog Breeds</strong>
        <ul style="list-style:none;margin-top:0.25rem">${topBreeds('DOG') || '<li style="color:var(--gray)">None</li>'}</ul>
      </div>
      <div style="margin-bottom:0.75rem">
        <strong style="font-size:0.75rem;text-transform:uppercase;color:var(--gray);letter-spacing:0.03em">Top Cat Breeds</strong>
        <ul style="list-style:none;margin-top:0.25rem">${topBreeds('CAT') || '<li style="color:var(--gray)">None</li>'}</ul>
      </div>
      <div style="margin-bottom:0.75rem">
        <strong style="font-size:0.75rem;text-transform:uppercase;color:var(--gray);letter-spacing:0.03em">Rarest Dogs</strong>
        <ul style="list-style:none;margin-top:0.25rem">${rareBreeds('DOG') || '<li style="color:var(--gray)">None</li>'}</ul>
      </div>
      <div style="margin-bottom:0.75rem">
        <strong style="font-size:0.75rem;text-transform:uppercase;color:var(--gray);letter-spacing:0.03em">Rarest Cats</strong>
        <ul style="list-style:none;margin-top:0.25rem">${rareBreeds('CAT') || '<li style="color:var(--gray)">None</li>'}</ul>
      </div>
      <div style="margin-bottom:0.75rem">
        <strong style="font-size:0.75rem;text-transform:uppercase;color:var(--gray);letter-spacing:0.03em">Signature Breeds</strong>
        <ul style="list-style:none;margin-top:0.25rem">
          <li><span class="dog-color">Dog:</span> ${sig('DOG')}</li>
          <li><span class="cat-color">Cat:</span> ${sig('CAT')}</li>
        </ul>
      </div>
      <div>
        <strong style="font-size:0.75rem;text-transform:uppercase;color:var(--gray);letter-spacing:0.03em">Licensing Rate</strong>
        <p style="margin-top:0.25rem">${perCapita}</p>
      </div>
    `;
  }

  // Legend
  function updateLegend() {
    svg.selectAll('.legend-group').remove();
    const g = svg.append('g').attr('class', 'legend-group');
    const legendWidth = 200;
    const legendHeight = 12;
    const legendX = width - legendWidth - 20;
    const legendY = height - 40;

    if (currentMode === 'ratio') {
      const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
      defs.selectAll('#map-gradient').remove();
      const gradient = defs.append('linearGradient').attr('id', 'map-gradient');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', ratioScale(1));
      gradient.append('stop').attr('offset', '50%').attr('stop-color', ratioScale(0.5));
      gradient.append('stop').attr('offset', '100%').attr('stop-color', ratioScale(0));

      g.append('rect').attr('x', legendX).attr('y', legendY)
        .attr('width', legendWidth).attr('height', legendHeight)
        .attr('fill', 'url(#map-gradient)').attr('rx', 3);
      g.append('text').attr('x', legendX).attr('y', legendY - 4)
        .attr('font-size', '0.625rem').attr('fill', '#6B7280').text('More cats');
      g.append('text').attr('x', legendX + legendWidth).attr('y', legendY - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '0.625rem').attr('fill', '#6B7280').text('More dogs');
    } else if (currentMode === 'density') {
      const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
      defs.selectAll('#map-gradient').remove();
      const gradient = defs.append('linearGradient').attr('id', 'map-gradient');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', densityScale(0));
      gradient.append('stop').attr('offset', '100%').attr('stop-color', densityScale(d3.max(perCapitaValues)));

      g.append('rect').attr('x', legendX).attr('y', legendY)
        .attr('width', legendWidth).attr('height', legendHeight)
        .attr('fill', 'url(#map-gradient)').attr('rx', 3);
      g.append('text').attr('x', legendX).attr('y', legendY - 4)
        .attr('font-size', '0.625rem').attr('fill', '#6B7280').text('Low');
      g.append('text').attr('x', legendX + legendWidth).attr('y', legendY - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '0.625rem').attr('fill', '#6B7280').text('High');
    }
  }

  // Add breed labels for common/signature modes
  function addBreedLabels() {
    svg.selectAll('.breed-label').remove();
    if (currentMode !== 'common' && currentMode !== 'signature') return;

    paths.each(function(d) {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      const data = fsaSummary[fsa];
      if (!data) return;

      let breedName = '';
      if (currentMode === 'common') {
        const top = data.top_breeds?.[currentSpecies]?.[0];
        breedName = top ? toTitleCase(top.breed) : '';
      } else {
        const sig = data.signature_breed?.[currentSpecies];
        breedName = sig ? toTitleCase(sig.breed) : '';
      }

      if (breedName) {
        const centroid = path.centroid(d);
        svg.append('text')
          .attr('class', 'breed-label')
          .attr('x', centroid[0])
          .attr('y', centroid[1])
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.5rem')
          .attr('fill', '#1A2B4A')
          .attr('pointer-events', 'none')
          .text(breedName.length > 12 ? breedName.slice(0, 11) + '...' : breedName);
      }
    });
  }

  // Mode select
  document.getElementById('map-mode')?.addEventListener('change', (e) => {
    currentMode = e.target.value;
    updateFills();
    addBreedLabels();
  });

  // Species toggle
  document.getElementById('map-species-toggle')?.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('map-species-toggle').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpecies = btn.dataset.value;
      updateFills();
      addBreedLabels();
    });
  });

  // Initial render
  updateFills();
}
