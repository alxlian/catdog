import * as d3 from 'd3';

export function renderMap(mapSelector, tooltipSelector, geoData, fsaSummary) {
  const container = document.querySelector(mapSelector);
  const tooltip = document.querySelector(tooltipSelector);
  if (!container || !tooltip) return;

  const width = 768;
  const height = 600;

  // Color scale: blue (cat-dominant) <-> neutral <-> red (dog-dominant)
  const colorScale = d3.scaleDiverging()
    .domain([0.3, 0.5, 0.8])
    .interpolator(d3.interpolateRdBu)
    .clamp(true);
  // Note: interpolateRdBu goes red->blue, but we want dog=red when ratio is high
  // dog_ratio near 1 = dog-dominant = red, near 0 = cat-dominant = blue
  // RdBu: 0=red, 1=blue — so we invert: use (1 - dog_ratio)
  const getColor = (fsa) => {
    const d = fsaSummary[fsa];
    if (!d) return '#E5E7EB';
    return colorScale(1 - d.dog_ratio);
  };

  const svg = d3.select(mapSelector)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Determine if GeoJSON or TopoJSON
  let features;
  if (geoData.type === 'Topology') {
    // TopoJSON — need topojson-client
    // For simplicity, assume GeoJSON FeatureCollection
    console.warn('TopoJSON detected — convert to GeoJSON before loading');
    return;
  } else {
    features = geoData.features;
  }

  // Fit projection to Toronto FSA bounds
  const projection = d3.geoMercator().fitSize([width, height], geoData);
  const path = d3.geoPath(projection);

  // Draw FSA polygons
  svg.selectAll('path')
    .data(features)
    .join('path')
    .attr('d', path)
    .attr('fill', d => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      return getColor(fsa);
    })
    .attr('stroke', '#1A2B4A')
    .attr('stroke-width', 0.5)
    .on('mouseenter', (event, d) => {
      const fsa = d.properties.CFSAUID || d.properties.FSA || d.properties.name;
      const data = fsaSummary[fsa];
      if (!data) return;
      d3.select(event.currentTarget).attr('stroke-width', 2).attr('opacity', 0.85);
      showTooltip(tooltip, event, fsa, data);
    })
    .on('mousemove', (event) => {
      tooltip.style.left = event.pageX + 12 + 'px';
      tooltip.style.top = event.pageY - 10 + 'px';
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).attr('stroke-width', 0.5).attr('opacity', 1);
      tooltip.style.display = 'none';
    });

  // Legend
  const legendWidth = 200;
  const legendHeight = 12;
  const legendX = width - legendWidth - 20;
  const legendY = height - 40;

  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient').attr('id', 'map-gradient');
  gradient.append('stop').attr('offset', '0%').attr('stop-color', colorScale(1)); // cat
  gradient.append('stop').attr('offset', '50%').attr('stop-color', colorScale(0.5));
  gradient.append('stop').attr('offset', '100%').attr('stop-color', colorScale(0)); // dog

  svg.append('rect')
    .attr('x', legendX).attr('y', legendY)
    .attr('width', legendWidth).attr('height', legendHeight)
    .attr('fill', 'url(#map-gradient)')
    .attr('rx', 3);

  svg.append('text').attr('x', legendX).attr('y', legendY - 4)
    .attr('font-size', '0.625rem').attr('fill', '#6B7280').text('More cats');
  svg.append('text').attr('x', legendX + legendWidth).attr('y', legendY - 4)
    .attr('text-anchor', 'end')
    .attr('font-size', '0.625rem').attr('fill', '#6B7280').text('More dogs');
}

function showTooltip(tooltip, event, fsa, data) {
  const topBreeds = (species) => {
    const breeds = data.top_breeds?.[species] || [];
    return breeds.map(b => `${b.breed} (${b.count})`).join(', ') || 'None';
  };
  const sig = (species) => {
    const s = data.signature_breed?.[species];
    return s ? `${s.breed} (${s.ratio}x city avg)` : 'None';
  };
  const perCapita = data.per_capita_rate
    ? (data.per_capita_rate * 1000).toFixed(1) + ' per 1,000'
    : 'N/A';

  const rareBreeds = (species) => {
    const breeds = data.rare_breeds?.[species] || [];
    return breeds.map(b => `${b.breed} (${b.count})`).join(', ') || 'None';
  };

  tooltip.innerHTML = `
    <strong>${data.neighbourhood}</strong> (${fsa})<br/>
    <span class="dog-color">${data.dog_count} dogs</span> /
    <span class="cat-color">${data.cat_count} cats</span><br/>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:0.5rem 0"/>
    <strong>Top dog breeds:</strong> ${topBreeds('DOG')}<br/>
    <strong>Top cat breeds:</strong> ${topBreeds('CAT')}<br/>
    <strong>Rarest dogs:</strong> ${rareBreeds('DOG')}<br/>
    <strong>Rarest cats:</strong> ${rareBreeds('CAT')}<br/>
    <strong>Signature dog breed:</strong> ${sig('DOG')}<br/>
    <strong>Signature cat breed:</strong> ${sig('CAT')}<br/>
    <strong>Licensing rate:</strong> ${perCapita}
  `;
  tooltip.style.display = 'block';
  tooltip.style.left = event.pageX + 12 + 'px';
  tooltip.style.top = event.pageY - 10 + 'px';
}
