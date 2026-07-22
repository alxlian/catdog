import * as d3 from 'd3';

export function renderLicensingOverTime(containerSelector, breedTrends) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Sum yearly totals per species from breed-trends data
  const yearlyData = {};
  for (const species of ['DOG', 'CAT']) {
    const breeds = breedTrends[species] || {};
    for (const entries of Object.values(breeds)) {
      for (const e of entries) {
        if (!yearlyData[e.year]) yearlyData[e.year] = { year: e.year, DOG: 0, CAT: 0 };
        yearlyData[e.year][species] += e.count;
      }
    }
  }

  const data = Object.values(yearlyData).sort((a, b) => a.year - b.year);
  if (!data.length) return;

  const margin = { top: 28, right: 80, bottom: 48, left: 56 };
  const width = 760;
  const height = 440;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data.slice(0, -1), d => Math.max(d.DOG, d.CAT)) * 1.15])
    .nice()
    .range([innerH, 0]);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('font-family', "'Gantari', system-ui, sans-serif")
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Gridlines
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line')
      .attr('stroke', '#E8E4DA')
      .attr('stroke-dasharray', '3 3'));

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format('d')).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick text')
      .attr('dy', '1em')
      .attr('fill', '#828282')
      .attr('font-size', '11px'));

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(',')(d)).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick text')
      .attr('dx', '-0.5em')
      .attr('fill', '#828282')
      .attr('font-size', '11px'));

  const dogColor = '#3274C9';
  const catColor = '#3B7EA1';

  // Split data into complete years vs partial (current year)
  const completeData = data.slice(0, -1);
  const lastEntry = data[data.length - 1];
  const lastCompleteEntry = completeData[completeData.length - 1];

  // Area fills (subtle)
  const dogArea = d3.area()
    .x(d => x(d.year))
    .y0(innerH)
    .y1(d => y(d.DOG))
    .curve(d3.curveMonotoneX);

  const catArea = d3.area()
    .x(d => x(d.year))
    .y0(innerH)
    .y1(d => y(d.CAT))
    .curve(d3.curveMonotoneX);

  svg.append('path')
    .datum(completeData)
    .attr('fill', dogColor)
    .attr('opacity', 0.08)
    .attr('pointer-events', 'none')
    .attr('d', dogArea);

  svg.append('path')
    .datum(completeData)
    .attr('fill', catColor)
    .attr('opacity', 0.08)
    .attr('pointer-events', 'none')
    .attr('d', catArea);

  // Lines — solid for complete years only
  const dogLine = d3.line().x(d => x(d.year)).y(d => y(d.DOG)).curve(d3.curveMonotoneX);
  const catLine = d3.line().x(d => x(d.year)).y(d => y(d.CAT)).curve(d3.curveMonotoneX);

  const drawLine = (lineGen, color, label) => {
    const path = svg.append('path')
      .datum(completeData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('pointer-events', 'none')
      .attr('d', lineGen);

    // Animate
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', `${len} ${len}`)
      .attr('stroke-dashoffset', len)
      .transition().duration(1000).ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // End dot on last complete year
    const val = label === 'Dogs' ? lastCompleteEntry.DOG : lastCompleteEntry.CAT;
    svg.append('circle')
      .attr('cx', x(lastCompleteEntry.year))
      .attr('cy', y(val))
      .attr('r', 4)
      .attr('fill', color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .transition().delay(900).duration(300).attr('opacity', 1);

    // Dashed line to partial year
    const partialVal = label === 'Dogs' ? lastEntry.DOG : lastEntry.CAT;
    const partialLineGen = d3.line().x(d => x(d.year)).y(d => y(label === 'Dogs' ? d.DOG : d.CAT)).curve(d3.curveMonotoneX);
    svg.append('path')
      .datum([lastCompleteEntry, lastEntry])
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 4')
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.5)
      .attr('pointer-events', 'none')
      .attr('d', partialLineGen);

    // Hollow dot on partial year
    svg.append('circle')
      .attr('cx', x(lastEntry.year))
      .attr('cy', y(partialVal))
      .attr('r', 4)
      .attr('fill', 'white')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('opacity', 0.6)
      .attr('pointer-events', 'none');

    // End label on last complete year
    svg.append('text')
      .attr('x', x(lastCompleteEntry.year) + 10)
      .attr('y', y(val))
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', color)
      .attr('pointer-events', 'none')
      .text(label)
      .attr('opacity', 0)
      .transition().delay(1000).duration(300).attr('opacity', 1);
  };

  drawLine(dogLine, dogColor, 'Dogs');
  drawLine(catLine, catColor, 'Cats');

  // "YTD" annotation under the partial year
  svg.append('text')
    .attr('x', x(lastEntry.year))
    .attr('y', innerH + 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '9px')
    .attr('fill', '#828282')
    .attr('font-style', 'italic')
    .text(lastEntry.year + ' (YTD)');

  // Hover interaction
  d3.select(container).style('position', 'relative');

  const hoverLine = svg.append('line')
    .attr('y1', 0).attr('y2', innerH)
    .attr('stroke', '#828282').attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '4 3').attr('opacity', 0)
    .attr('pointer-events', 'none');

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
    .style('z-index', '10')
    .style('transition', 'opacity 0.15s');

  // Hover rect — use SVG coordinates via d3.pointer which accounts for viewBox scaling
  svg.append('rect')
    .attr('width', innerW).attr('height', innerH)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .style('cursor', 'crosshair')
    .on('mousemove', (event) => {
      const [mx, my] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      const entry = data.find(d => d.year === year);
      if (!entry) {
        hoverLine.attr('opacity', 0);
        tooltipEl.style('opacity', 0);
        return;
      }

      const cx = x(year);
      hoverLine.attr('x1', cx).attr('x2', cx).attr('opacity', 1);

      const isPartial = year === lastEntry.year;
      const yearLabel = isPartial ? `${year} (so far)` : year;

      tooltipEl.html(`
        <div style="font-weight:600;margin-bottom:4px;color:#000">${yearLabel}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
          <span style="width:8px;height:8px;border-radius:50%;background:${dogColor};display:inline-block"></span>
          <span style="color:#828282">Dogs</span>
          <span style="margin-left:auto;font-weight:500;color:#000">${d3.format(',')(entry.DOG)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
          <span style="width:8px;height:8px;border-radius:50%;background:${catColor};display:inline-block"></span>
          <span style="color:#828282">Cats</span>
          <span style="margin-left:auto;font-weight:500;color:#000">${d3.format(',')(entry.CAT)}</span>
        </div>
      `).style('opacity', 1);

      // Position tooltip using mouse position relative to container
      const containerRect = container.getBoundingClientRect();
      tooltipEl
        .style('left', (event.clientX - containerRect.left + 16) + 'px')
        .style('top', (event.clientY - containerRect.top - 20) + 'px');
    })
    .on('mouseleave', () => {
      hoverLine.attr('opacity', 0);
      tooltipEl.style('opacity', 0);
    });
}
