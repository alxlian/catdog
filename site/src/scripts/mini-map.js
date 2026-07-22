import * as d3 from 'd3';

export function renderMiniMap(containerSelector, geoData, fsaSummary) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const width = 500;
  const height = 440;

  const ratioScale = d3.scaleDiverging()
    .domain([0.3, 0.5, 0.8])
    .interpolator(d3.interpolateRdBu)
    .clamp(true);

  const features = geoData.type === 'Topology' ? [] : geoData.features;
  if (!features.length) return;

  const projection = d3.geoMercator().fitSize([width, height], geoData);
  const path = d3.geoPath(projection);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('font-family', "'Gantari', system-ui, sans-serif");

  const paths = svg.selectAll('path')
    .data(features)
    .join('path')
    .attr('d', path)
    .attr('stroke', 'white')
    .attr('stroke-width', 0.75)
    .attr('fill', d => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      const data = fsaSummary[fsa];
      if (!data) return '#E5E7EB';
      return ratioScale(1 - data.dog_ratio);
    })
    .style('transition', 'opacity 0.15s');

  // Tooltip
  d3.select(container).style('position', 'relative');

  const isMobile = window.innerWidth <= 768;

  const tooltip = d3.select(container).append('div')
    .attr('class', 'mini-map-tooltip')
    .style('position', isMobile ? 'relative' : 'absolute')
    .style('background', isMobile ? 'rgba(255,255,255,0.6)' : 'white')
    .style('border', isMobile ? 'none' : '1px solid #EFEAE0')
    .style('border-radius', isMobile ? '8px' : '10px')
    .style('padding', isMobile ? '8px 10px' : '14px 18px')
    .style('font-size', isMobile ? '11px' : '12px')
    .style('font-family', "'Gantari', system-ui, sans-serif")
    .style('box-shadow', isMobile ? 'none' : '0 6px 24px rgba(0,0,0,0.1)')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('transition', 'opacity 0.15s')
    .style('min-width', isMobile ? '0' : '200px')
    .style('z-index', '10')
    .style('margin-top', isMobile ? '6px' : '0');

  paths
    .on('mouseenter', (event, d) => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      const data = fsaSummary[fsa];
      if (!data) return;

      // Highlight
      paths.style('opacity', 0.4);
      d3.select(event.currentTarget).style('opacity', 1).attr('stroke', '#000').attr('stroke-width', 1.5);

      const total = data.dog_count + data.cat_count;
      const dogPct = Math.round((data.dog_count / total) * 100);
      const catPct = 100 - dogPct;

      if (isMobile) {
        tooltip.html(`
          <div style="display:flex;align-items:center;gap:8px">
            <strong style="font-size:12px;color:#0F1532">${data.neighbourhood}</strong>
            <span style="font-size:10px;color:#828282">${dogPct}% dogs · ${catPct}% cats</span>
          </div>
        `).style('opacity', 1);
        // Update accordion max-height to fit tooltip
        const body = container.closest('.accordion-body');
        if (body) body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        tooltip.html(`
          <div style="font-weight:600;font-size:14px;margin-bottom:2px">${data.neighbourhood}</div>
          <div style="color:#828282;font-size:11px;margin-bottom:10px">${fsa}</div>
          <div style="display:flex;border-radius:6px;overflow:hidden;height:24px;margin-bottom:6px">
            <div style="width:${dogPct}%;background:#3274C9;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:500;min-width:30px">${d3.format(',')(data.dog_count)}</div>
            <div style="width:${catPct}%;background:#3B7EA1;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:500;min-width:30px">${d3.format(',')(data.cat_count)}</div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#828282">
            <span><span style="color:#3274C9;font-weight:500">Dogs</span> ${dogPct}%</span>
            <span><span style="color:#3B7EA1;font-weight:500">Cats</span> ${catPct}%</span>
          </div>
        `).style('opacity', 1);
      }
    })
    .on('mousemove', (event) => {
      if (isMobile) return;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Position tooltip to the right of cursor, flip if near edge
      const tooltipW = 220;
      const left = x + tooltipW + 20 > rect.width ? x - tooltipW - 10 : x + 16;
      tooltip.style('left', left + 'px').style('top', (y - 30) + 'px');
    })
    .on('mouseleave', (event) => {
      paths.style('opacity', 1).attr('stroke', 'white').attr('stroke-width', 0.75);
      tooltip.style('opacity', 0);
    });

  // Legend
  const legendG = svg.append('g').attr('transform', `translate(${(width - 140) / 2}, ${height - 30})`);
  const legendW = 140;
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient').attr('id', 'mini-map-grad');
  gradient.append('stop').attr('offset', '0%').attr('stop-color', ratioScale(1));
  gradient.append('stop').attr('offset', '50%').attr('stop-color', ratioScale(0.5));
  gradient.append('stop').attr('offset', '100%').attr('stop-color', ratioScale(0));

  legendG.append('rect').attr('width', legendW).attr('height', 8)
    .attr('fill', 'url(#mini-map-grad)').attr('rx', 4);
  legendG.append('text').attr('y', -4).attr('font-size', '9px').attr('fill', '#828282').text('More cats');
  legendG.append('text').attr('x', legendW).attr('y', -4)
    .attr('text-anchor', 'end').attr('font-size', '9px').attr('fill', '#828282').text('More dogs');
}
