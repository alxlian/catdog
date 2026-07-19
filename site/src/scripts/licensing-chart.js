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
  const height = 340;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.DOG, d.CAT)) * 1.1])
    .nice()
    .range([innerH, 0]);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('font-family', "'Lexend', system-ui, sans-serif")
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

  const dogColor = '#EB5E28';
  const catColor = '#3B7EA1';

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
    .datum(data)
    .attr('fill', dogColor)
    .attr('opacity', 0.08)
    .attr('d', dogArea);

  svg.append('path')
    .datum(data)
    .attr('fill', catColor)
    .attr('opacity', 0.08)
    .attr('d', catArea);

  // Lines
  const dogLine = d3.line().x(d => x(d.year)).y(d => y(d.DOG)).curve(d3.curveMonotoneX);
  const catLine = d3.line().x(d => x(d.year)).y(d => y(d.CAT)).curve(d3.curveMonotoneX);

  const drawLine = (lineGen, color, label) => {
    const path = svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);

    // Animate
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', `${len} ${len}`)
      .attr('stroke-dashoffset', len)
      .transition().duration(1000).ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // End dot
    const last = data[data.length - 1];
    const val = label === 'Dogs' ? last.DOG : last.CAT;
    svg.append('circle')
      .attr('cx', x(last.year))
      .attr('cy', y(val))
      .attr('r', 4)
      .attr('fill', color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition().delay(900).duration(300).attr('opacity', 1);

    // End label
    svg.append('text')
      .attr('x', x(last.year) + 10)
      .attr('y', y(val))
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', color)
      .text(label)
      .attr('opacity', 0)
      .transition().delay(1000).duration(300).attr('opacity', 1);
  };

  drawLine(dogLine, dogColor, 'Dogs');
  drawLine(catLine, catColor, 'Cats');

  // Hover interaction
  const hoverLine = svg.append('line')
    .attr('y1', 0).attr('y2', innerH)
    .attr('stroke', '#828282').attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '4 3').attr('opacity', 0);

  const tooltipEl = d3.select(container).append('div')
    .style('position', 'absolute')
    .style('background', 'white')
    .style('border', '1px solid #EFEAE0')
    .style('border-radius', '8px')
    .style('padding', '10px 14px')
    .style('font-size', '12px')
    .style('font-family', "'Lexend', system-ui, sans-serif")
    .style('box-shadow', '0 4px 16px rgba(0,0,0,0.08)')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('transition', 'opacity 0.15s');

  d3.select(container).style('position', 'relative');

  svg.append('rect')
    .attr('width', innerW).attr('height', innerH)
    .attr('fill', 'transparent').style('cursor', 'crosshair')
    .on('mousemove', (event) => {
      const [mx] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      const entry = data.find(d => d.year === year);
      if (!entry) return;
      const cx = x(year);
      hoverLine.attr('x1', cx).attr('x2', cx).attr('opacity', 1);

      tooltipEl.html(`
        <div style="font-weight:600;margin-bottom:4px">${year}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
          <span style="width:8px;height:8px;border-radius:50%;background:${dogColor};display:inline-block"></span>
          <span style="color:#828282">Dogs</span>
          <span style="margin-left:auto;font-weight:500">${d3.format(',')(entry.DOG)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
          <span style="width:8px;height:8px;border-radius:50%;background:${catColor};display:inline-block"></span>
          <span style="color:#828282">Cats</span>
          <span style="margin-left:auto;font-weight:500">${d3.format(',')(entry.CAT)}</span>
        </div>
      `).style('opacity', 1);

      const containerRect = container.getBoundingClientRect();
      const svgRect = container.querySelector('svg').getBoundingClientRect();
      tooltipEl
        .style('left', (svgRect.left - containerRect.left + margin.left + cx + 16) + 'px')
        .style('top', (event.clientY - containerRect.top - 20) + 'px');
    })
    .on('mouseleave', () => {
      hoverLine.attr('opacity', 0);
      tooltipEl.style('opacity', 0);
    });
}
