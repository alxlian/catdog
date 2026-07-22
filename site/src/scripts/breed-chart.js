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

// Warm palette that matches the site's cream/gold/orange theme
const CHART_PALETTE = ['#EB5E28', '#3B7EA1', '#D4960A', '#7B6D4E', '#9C4D8B'];

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

  const displayBreeds = breeds.slice(0, 5);
  if (!displayBreeds.length) {
    container.innerHTML = '<p style="color:var(--gray)">No matching breeds found.</p>';
    return;
  }

  const margin = { top: 32, right: 120, bottom: 48, left: 56 };
  const width = 760;
  const height = 380;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const allEntries = displayBreeds.flatMap(b => data[b]);
  const years = [...new Set(allEntries.map(e => e.year))].sort();

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(allEntries, e => e.share) * 100])
    .nice()
    .range([innerH, 0]);
  const color = d3.scaleOrdinal(CHART_PALETTE);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('font-family', "'Gantari', system-ui, sans-serif")
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Horizontal gridlines (subtle)
  svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line')
      .attr('stroke', '#E8E4DA')
      .attr('stroke-dasharray', '3 3'));

  // X axis — clean, no domain line
  svg.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format('d')).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick text')
      .attr('dy', '1em')
      .attr('fill', '#828282')
      .attr('font-size', '11px'));

  // Y axis — clean, no domain line
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%').tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick text')
      .attr('dx', '-0.5em')
      .attr('fill', '#828282')
      .attr('font-size', '11px'));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.share * 100))
    .curve(d3.curveMonotoneX);

  // Draw lines with hover interaction
  const breedGroups = [];
  displayBreeds.forEach((breed, i) => {
    const entries = data[breed];
    const lastEntry = entries[entries.length - 1];

    const group = svg.append('g').attr('class', 'breed-line-group');

    // Line
    const path = group.append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', color(i))
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', line)
      .style('transition', 'opacity 0.2s, stroke-width 0.2s');

    // Animate line drawing on initial render
    const totalLength = path.node().getTotalLength();
    path.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1000)
      .delay(i * 150)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Dots — only show on endpoints
    group.append('circle')
      .attr('cx', x(entries[0].year))
      .attr('cy', y(entries[0].share * 100))
      .attr('r', 3)
      .attr('fill', color(i))
      .attr('opacity', 0)
      .transition().delay(i * 150 + 900).duration(300)
      .attr('opacity', 1);

    group.append('circle')
      .attr('cx', x(lastEntry.year))
      .attr('cy', y(lastEntry.share * 100))
      .attr('r', 4)
      .attr('fill', color(i))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition().delay(i * 150 + 900).duration(300)
      .attr('opacity', 1);

    // End label — inline on chart
    group.append('text')
      .attr('x', x(lastEntry.year) + 10)
      .attr('y', y(lastEntry.share * 100))
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', color(i))
      .text(toTitleCase(breed))
      .attr('opacity', 0)
      .transition().delay(i * 150 + 1000).duration(300)
      .attr('opacity', 1);

    breedGroups.push({ group, breed, color: color(i) });
  });

  // Hover interaction — highlight one, dim others
  const hoverRect = svg.append('rect')
    .attr('width', innerW)
    .attr('height', innerH)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair');

  // Vertical crosshair
  const crosshair = svg.append('line')
    .attr('y1', 0).attr('y2', innerH)
    .attr('stroke', '#828282')
    .attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '4 3')
    .attr('opacity', 0);

  // Hover dots
  const hoverDots = displayBreeds.map((_, i) =>
    svg.append('circle')
      .attr('r', 5)
      .attr('fill', color(i))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
  );

  // Tooltip
  const tooltipEl = d3.select(container).append('div')
    .style('position', 'absolute')
    .style('background', 'white')
    .style('border', '1px solid #EFEAE0')
    .style('border-radius', '8px')
    .style('padding', '10px 14px')
    .style('font-size', '12px')
    .style('font-family', "'Gantari', system-ui, sans-serif")
    .style('box-shadow', '0 4px 16px rgba(0,0,0,0.08)')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('transition', 'opacity 0.15s');

  // Make container relative for tooltip positioning
  d3.select(container).style('position', 'relative');

  hoverRect
    .on('mousemove', (event) => {
      const [mx] = d3.pointer(event);
      const hoveredYear = Math.round(x.invert(mx));
      const clampedX = x(hoveredYear);

      crosshair.attr('x1', clampedX).attr('x2', clampedX).attr('opacity', 1);

      let tooltipHTML = `<div style="font-weight:600;margin-bottom:4px;color:#000">${hoveredYear}</div>`;
      displayBreeds.forEach((breed, i) => {
        const entry = data[breed].find(e => e.year === hoveredYear);
        if (entry) {
          const val = (entry.share * 100).toFixed(2);
          hoverDots[i]
            .attr('cx', clampedX)
            .attr('cy', y(entry.share * 100))
            .attr('opacity', 1);
          tooltipHTML += `<div style="display:flex;align-items:center;gap:6px;margin-top:3px">
            <span style="width:8px;height:8px;border-radius:50%;background:${color(i)};display:inline-block"></span>
            <span style="color:#828282">${toTitleCase(breed)}</span>
            <span style="margin-left:auto;font-weight:500;color:#000">${val}%</span>
          </div>`;
        } else {
          hoverDots[i].attr('opacity', 0);
        }
      });

      tooltipEl.html(tooltipHTML).style('opacity', 1);

      // Position tooltip
      const containerRect = container.getBoundingClientRect();
      const svgRect = container.querySelector('svg').getBoundingClientRect();
      const tooltipX = svgRect.left - containerRect.left + margin.left + clampedX + 16;
      const tooltipY = event.clientY - containerRect.top - 20;
      tooltipEl.style('left', tooltipX + 'px').style('top', tooltipY + 'px');
    })
    .on('mouseleave', () => {
      crosshair.attr('opacity', 0);
      hoverDots.forEach(d => d.attr('opacity', 0));
      tooltipEl.style('opacity', 0);
    });

  // Legend below chart (simplified — inline labels handle primary identification)
  if (legendContainer) {
    displayBreeds.forEach((breed, i) => {
      const item = document.createElement('span');
      item.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-right:16px;font-size:13px;color:#828282;cursor:pointer;';
      item.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${color(i)};display:inline-block"></span>${toTitleCase(breed)}`;

      // Hover to highlight
      item.addEventListener('mouseenter', () => {
        breedGroups.forEach(({ group }, j) => {
          group.style('opacity', j === i ? 1 : 0.15);
        });
      });
      item.addEventListener('mouseleave', () => {
        breedGroups.forEach(({ group }) => group.style('opacity', 1));
      });

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

  risingEl.innerHTML = renderTrendList(rising, '#EB5E28');
  decliningEl.innerHTML = renderTrendList(declining, '#3B7EA1');
}

function renderTrendList(items, color) {
  if (!items.length) return '<p style="color:#828282;font-size:13px">Not enough data</p>';

  return items.map(item => {
    const pct = (item.change * 100).toFixed(1);
    const sign = item.change >= 0 ? '+' : '';

    // Sparkline from share entries
    const shares = item.entries.map(e => e.share * 100);
    const min = Math.min(...shares);
    const max = Math.max(...shares);
    const range = max - min || 1;
    const points = shares.map((s, i) => {
      const xPos = (i / (shares.length - 1)) * 56;
      const yPos = 18 - ((s - min) / range) * 16;
      return `${xPos},${yPos}`;
    }).join(' ');

    // Area fill under sparkline
    const areaPoints = `0,18 ${points} 56,18`;

    return `<div style="margin-bottom:0.625rem;display:flex;align-items:center;gap:0.75rem;padding:8px 12px;border-radius:8px;transition:background 0.15s;" onmouseenter="this.style.background='#EFEAE0'" onmouseleave="this.style.background='transparent'">
      <svg viewBox="0 0 56 20" style="width:3.5rem;height:1.25rem;flex-shrink:0">
        <polygon points="${areaPoints}" fill="${color}" opacity="0.1"/>
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-family:'Gantari',system-ui,sans-serif">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#000">${toTitleCase(item.breed)}</span>
          <span style="font-weight:600;flex-shrink:0;margin-left:0.75rem;color:${color}">${sign}${pct}%</span>
        </div>
      </div>
    </div>`;
  }).join('');
}
