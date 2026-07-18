import * as d3 from 'd3';

export function renderDonut(selector, speciesSplit) {
  const container = document.querySelector(selector);
  if (!container) return;

  const width = 160;
  const height = 160;
  const radius = Math.min(width, height) / 2;
  const innerRadius = radius * 0.6;

  const data = [
    { label: 'Dogs', value: speciesSplit.DOG, color: '#C41E3A' },
    { label: 'Cats', value: speciesSplit.CAT, color: '#3B7EA1' },
  ];

  const svg = d3.select(selector)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);

  svg.selectAll('path')
    .data(pie(data))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => d.data.color)
    .attr('stroke', '#FAFAF8')
    .attr('stroke-width', 2);

  // Center label
  const total = data.reduce((s, d) => s + d.value, 0);
  const dogPct = Math.round((speciesSplit.DOG / total) * 100);
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.1em')
    .attr('font-size', '1.5rem')
    .attr('font-weight', '700')
    .attr('fill', '#1A2B4A')
    .text(`${dogPct}%`);
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.2em')
    .attr('font-size', '0.625rem')
    .attr('fill', '#6B7280')
    .text('dogs');
}
