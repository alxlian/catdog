import * as d3 from 'd3';
import { toTitleCase } from './utils.js';

export function renderMap(mapSelector, tooltipSelector, listSelector, geoData, fsaSummary) {
  const container = document.querySelector(mapSelector);
  const tooltip = document.querySelector(tooltipSelector);
  const listEl = document.querySelector(listSelector);
  if (!container) return;

  const width = 768;
  const height = 600;
  let currentMode = 'common';
  let currentSpecies = 'DOG';

  // Vibrant color palette — each unique breed gets a distinct color
  const breedColorCache = {};
  let breedHueIndex = 0;
  const palette = [
    '#E8913A', '#5DADE2', '#58D68D', '#AF7AC5', '#F1948A',
    '#F7DC6F', '#85C1E9', '#73C6B6', '#D7BDE2', '#F0B27A',
    '#AED6F1', '#A3E4D7', '#FADBD8', '#D5F5E3', '#FCF3CF',
    '#E59866', '#48C9B0', '#7FB3D8', '#C39BD3', '#F5B041',
    '#76D7C4', '#EB984E', '#82E0AA', '#BB8FCE', '#F4D03F',
  ];

  function getBreedColor(breed) {
    if (!breed) return '#E5E7EB';
    if (breedColorCache[breed]) return breedColorCache[breed];
    breedColorCache[breed] = palette[breedHueIndex % palette.length];
    breedHueIndex++;
    return breedColorCache[breed];
  }

  // Ownership ratio: red/blue diverging (matching the At a Glance mini map)
  const ownershipScale = d3.scaleDiverging()
    .domain([0.3, 0.5, 0.8])
    .interpolator(d3.interpolateRdBu)
    .clamp(true);

  function getBreedForMode(fsa) {
    const d = fsaSummary[fsa];
    if (!d) return null;
    if (currentMode === 'common') {
      return d.top_breeds?.[currentSpecies]?.[0]?.breed || null;
    } else if (currentMode === 'signature') {
      return d.signature_breed?.[currentSpecies]?.breed || null;
    } else if (currentMode === 'rare') {
      return d.rare_breeds?.[currentSpecies]?.[0]?.breed || null;
    }
    return null;
  }

  function getColor(fsa) {
    const d = fsaSummary[fsa];
    if (!d) return '#E5E7EB';
    if (currentMode === 'ratio') return ownershipScale(1 - d.dog_ratio);
    const breed = getBreedForMode(fsa);
    return getBreedColor(breed);
  }

  // Separate breed name and stat value for the two list elements
  function getBreedText(fsa) {
    const d = fsaSummary[fsa];
    if (!d) return '';
    if (currentMode === 'common') {
      const b = d.top_breeds?.[currentSpecies]?.[0];
      return b ? toTitleCase(b.breed) : '—';
    } else if (currentMode === 'signature') {
      const s = d.signature_breed?.[currentSpecies];
      return s ? toTitleCase(s.breed) : '—';
    } else if (currentMode === 'rare') {
      const b = d.rare_breeds?.[currentSpecies]?.[0];
      return b ? toTitleCase(b.breed) : '—';
    } else if (currentMode === 'ratio') {
      return `${d.dog_count} dogs · ${d.cat_count} cats`;
    }
    return '';
  }

  function getStatValue(fsa) {
    const d = fsaSummary[fsa];
    if (!d) return '';
    const speciesCount = currentSpecies === 'DOG' ? d.dog_count : d.cat_count;
    if (currentMode === 'common') {
      const b = d.top_breeds?.[currentSpecies]?.[0];
      if (!b || !speciesCount) return '—';
      return `${Math.round((b.count / speciesCount) * 100)}%`;
    } else if (currentMode === 'signature') {
      const s = d.signature_breed?.[currentSpecies];
      return s ? `${s.ratio}×` : '—';
    } else if (currentMode === 'rare') {
      const b = d.rare_breeds?.[currentSpecies]?.[0];
      return b ? b.count.toString() : '—';
    } else if (currentMode === 'ratio') {
      return `${Math.round(d.dog_ratio * 100)}%`;
    }
    return '';
  }

  // Update the context header above the list
  const contextDescriptions = {
    common: {
      DOG: { title: 'Common Breed — Dogs', desc: 'The most frequently registered dog breed in each neighbourhood. The percentage shows how much of the area\'s dog population that breed makes up.' },
      CAT: { title: 'Common Breed — Cats', desc: 'The most frequently registered cat breed in each neighbourhood. The percentage shows how much of the area\'s cat population that breed makes up.' },
    },
    signature: {
      DOG: { title: 'Signature Breed — Dogs', desc: 'The dog breed that\'s unusually concentrated in each neighbourhood compared to the city average. The multiplier (×) shows how much more common it is here than citywide.' },
      CAT: { title: 'Signature Breed — Cats', desc: 'The cat breed that\'s unusually concentrated in each neighbourhood compared to the city average. The multiplier (×) shows how much more common it is here than citywide.' },
    },
    rare: {
      DOG: { title: 'Rarest Breed — Dogs', desc: 'The least common dog breed registered in each neighbourhood. The number shows the total count of that breed in the area.' },
      CAT: { title: 'Rarest Breed — Cats', desc: 'The least common cat breed registered in each neighbourhood. The number shows the total count of that breed in the area.' },
    },
    ratio: {
      DOG: { title: 'Dog/Cat Ownership', desc: 'The split between dog and cat licenses in each neighbourhood. The percentage shows the proportion that are dogs.' },
      CAT: { title: 'Dog/Cat Ownership', desc: 'The split between dog and cat licenses in each neighbourhood. The percentage shows the proportion that are dogs.' },
    },
  };

  function updateContextHeader() {
    const ctx = document.getElementById('list-context');
    if (!ctx) return;
    const info = contextDescriptions[currentMode]?.[currentSpecies];
    if (!info) return;
    ctx.querySelector('.list-context-title').textContent = info.title;
    ctx.querySelector('.list-context-desc').textContent = info.desc;
  }

  // Rich tooltip content with contextual detail
  function getTooltipHTML(fsa) {
    const d = fsaSummary[fsa];
    if (!d) return '';
    const species = currentSpecies === 'DOG' ? 'dog' : 'cat';
    const speciesCount = currentSpecies === 'DOG' ? d.dog_count : d.cat_count;
    let detail = '';

    if (currentMode === 'common') {
      const b = d.top_breeds?.[currentSpecies]?.[0];
      if (b) {
        const pct = Math.round((b.count / speciesCount) * 100);
        detail = `<div class="tt-label">Most Common ${species}</div>
          <div class="tt-value">${toTitleCase(b.breed)}</div>
          <div class="tt-detail">${b.count} of ${speciesCount} ${species}s (${pct}%)</div>`;
      }
    } else if (currentMode === 'signature') {
      const s = d.signature_breed?.[currentSpecies];
      if (s) {
        detail = `<div class="tt-label">Signature ${species} breed</div>
          <div class="tt-value">${toTitleCase(s.breed)}</div>
          <div class="tt-detail">${s.ratio}× the city average</div>`;
      } else {
        detail = `<div class="tt-detail">No standout signature breed</div>`;
      }
    } else if (currentMode === 'rare') {
      const b = d.rare_breeds?.[currentSpecies]?.[0];
      if (b) {
        detail = `<div class="tt-label">Rarest ${species} breed</div>
          <div class="tt-value">${toTitleCase(b.breed)}</div>
          <div class="tt-detail">Only ${b.count} registered</div>`;
      }
    } else if (currentMode === 'ratio') {
      const dogPct = Math.round(d.dog_ratio * 100);
      detail = `<div class="tt-label">Ownership split</div>
        <div class="tt-bar">
          <div class="tt-bar-dog" style="width:${dogPct}%">${d.dog_count}</div>
          <div class="tt-bar-cat" style="width:${100 - dogPct}%">${d.cat_count}</div>
        </div>
        <div class="tt-detail">${dogPct}% dogs · ${100 - dogPct}% cats</div>`;
    }

    return `<div class="tt-name">${d.neighbourhood}</div>
      <div class="tt-fsa">${fsa} · ${d.total.toLocaleString()} pets</div>
      ${detail}`;
  }

  const features = geoData.type === 'Topology' ? [] : geoData.features;
  if (!features.length) return;

  const projection = d3.geoMercator().fitSize([width, height], geoData);
  const path = d3.geoPath(projection);

  const svg = d3.select(mapSelector)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Add tooltip styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .tt-name { font-weight: 600; font-size: 13px; margin-bottom: 1px; }
    .tt-fsa { font-size: 11px; color: #828282; margin-bottom: 8px; }
    .tt-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #828282; margin-bottom: 2px; }
    .tt-value { font-size: 14px; font-weight: 600; color: #EB5E28; margin-bottom: 2px; }
    .tt-detail { font-size: 11px; color: #828282; }
    .tt-bar { display: flex; border-radius: 4px; overflow: hidden; height: 20px; margin-bottom: 4px; }
    .tt-bar-dog { background: #EB5E28; color: white; font-size: 10px; font-weight: 500; display: flex; align-items: center; justify-content: center; min-width: 28px; }
    .tt-bar-cat { background: #3B7EA1; color: white; font-size: 10px; font-weight: 500; display: flex; align-items: center; justify-content: center; min-width: 28px; }
  `;
  document.head.appendChild(styleEl);

  const paths = svg.selectAll('path')
    .data(features)
    .join('path')
    .attr('d', path)
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5);

  function resetBreedColors() {
    Object.keys(breedColorCache).forEach(k => delete breedColorCache[k]);
    breedHueIndex = 0;
    // Pre-assign colors by frequency for consistency
    const breedCounts = {};
    for (const [fsa] of Object.entries(fsaSummary)) {
      const breed = getBreedForMode(fsa);
      if (breed) breedCounts[breed] = (breedCounts[breed] || 0) + 1;
    }
    Object.entries(breedCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([breed]) => getBreedColor(breed));
  }

  function updateFills() {
    resetBreedColors();
    paths.attr('fill', d => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      return getColor(fsa);
    });
    updateListStats();
    updateColorDots();
    updateContextHeader();
  }

  const TOOLTIP_W = 220;
  const TOOLTIP_GAP = 14;

  function positionTooltip(event) {
    if (!tooltip) return;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // Flip to left side if tooltip would overflow right edge
    const left = (x + TOOLTIP_W + TOOLTIP_GAP > rect.width)
      ? x - TOOLTIP_W - TOOLTIP_GAP
      : x + TOOLTIP_GAP;
    // Keep vertically within container
    const top = Math.max(4, Math.min(y - 10, rect.height - 120));
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  // Hover — rich tooltip (no scroll-to-row)
  paths
    .on('mouseenter', (event, d) => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      const data = fsaSummary[fsa];
      if (!data) return;
      d3.select(event.currentTarget).attr('stroke-width', 2).attr('opacity', 0.85);

      if (tooltip) {
        tooltip.innerHTML = getTooltipHTML(fsa);
        tooltip.style.display = 'block';
        positionTooltip(event);
      }
    })
    .on('mousemove', (event) => {
      positionTooltip(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).attr('stroke-width', 0.5).attr('opacity', 1);
      if (tooltip) tooltip.style.display = 'none';
    });

  // Update list breed + stat text
  function updateListStats() {
    if (!listEl) return;
    listEl.querySelectorAll('[data-fsa-breed]').forEach(el => {
      el.textContent = getBreedText(el.dataset.fsaBreed);
    });
    listEl.querySelectorAll('[data-fsa-stat]').forEach(el => {
      el.textContent = getStatValue(el.dataset.fsaStat);
    });
  }

  // Update color dots to match map fills
  function updateColorDots() {
    if (!listEl) return;
    listEl.querySelectorAll('[data-fsa-dot]').forEach(el => {
      el.style.backgroundColor = getColor(el.dataset.fsaDot);
    });
  }

  // Neighbourhood list rows: hover highlights map region
  if (listEl) {
    listEl.querySelectorAll('.nbh-row').forEach(row => {
      const fsa = row.dataset.fsa;
      row.addEventListener('mouseenter', () => {
        paths.each(function(d) {
          const pathFsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
          if (pathFsa === fsa) {
            d3.select(this).attr('stroke-width', 2).attr('opacity', 0.85);
          }
        });
      });
      row.addEventListener('mouseleave', () => {
        paths.each(function(d) {
          const pathFsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
          if (pathFsa === fsa) {
            d3.select(this).attr('stroke-width', 0.5).attr('opacity', 1);
          }
        });
      });
    });
  }

  // Mode button group
  document.querySelectorAll('#map-mode-group .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#map-mode-group .mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      updateFills();
    });
  });

  // Species toggle
  document.getElementById('map-species-toggle')?.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('map-species-toggle').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpecies = btn.dataset.value;
      updateFills();
    });
  });

  // Initial render
  updateFills();
}
