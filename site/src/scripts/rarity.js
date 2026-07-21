import { toTitleCase } from './utils.js';

export function initRarityLookup(breedList, fsaSummary, gtaFsaList) {
  const toggleContainer = document.getElementById('rarity-species-toggle');
  const breedInput = document.getElementById('rarity-breed-input');
  const breedDropdown = document.getElementById('breed-dropdown');
  const nbhInput = document.getElementById('rarity-nbh-input');
  const nbhDropdown = document.getElementById('nbh-dropdown');
  const resultDiv = document.getElementById('rarity-result');

  if (!breedInput || !nbhInput || !resultDiv) return;

  // GTA-only FSAs
  const gtaFsas = new Set(gtaFsaList);

  let currentSpecies = 'DOG';
  let selectedBreed = '';
  let selectedFsa = '';

  // --- Normalize breed names ---
  function normalizeBreed(raw) {
    return raw.trim().replace(/\s*-\s*$/, '').replace(/\s*\(\s*$/, '').trim();
  }

  function isJunkBreed(raw) {
    const b = raw.trim();
    if (b.endsWith('-') || b.endsWith('(')) return true;
    if (b.length < 2) return true;
    return false;
  }

  function buildCanonicalKey(raw) {
    return raw.trim()
      .replace(/\s*-\s*$/, '')
      .replace(/\s*\(\s*$/, '')
      .trim()
      .toUpperCase()
      .replace(/[-\s]+/g, ' ')
      .replace(/^1\/2\s+/, 'HALF ');
  }

  // Filter to GTA FSAs only
  const gtaBreedList = breedList.filter(e => gtaFsas.has(e.fsa));

  // Build canonical map
  const canonicalMap = {};
  for (const entry of gtaBreedList) {
    if (isJunkBreed(entry.breed)) continue;
    const canon = buildCanonicalKey(entry.breed);
    const sp = entry.species;
    if (!canonicalMap[sp]) canonicalMap[sp] = {};
    if (!canonicalMap[sp][canon]) {
      canonicalMap[sp][canon] = { displayName: normalizeBreed(entry.breed), rawBreeds: new Set(), totalCount: 0 };
    }
    canonicalMap[sp][canon].rawBreeds.add(entry.breed);
    canonicalMap[sp][canon].totalCount += entry.count;
  }

  // Build merged index
  const mergedIndex = {};
  const mergedBreedTotals = {};
  const mergedFsasByBreed = {};
  const speciesTotals = {};

  for (const entry of gtaBreedList) {
    if (isJunkBreed(entry.breed)) continue;
    const canon = buildCanonicalKey(entry.breed);
    const sp = entry.species;
    const indexKey = `${sp}|${canon}|${entry.fsa}`;

    if (!mergedIndex[indexKey]) {
      mergedIndex[indexKey] = { count: 0, rarity_percentile: entry.rarity_percentile || 0 };
    }
    mergedIndex[indexKey].count += entry.count;
    if ((entry.rarity_percentile || 0) > mergedIndex[indexKey].rarity_percentile) {
      mergedIndex[indexKey].rarity_percentile = entry.rarity_percentile;
    }

    const breedKey = `${sp}|${canon}`;
    mergedBreedTotals[breedKey] = (mergedBreedTotals[breedKey] || 0) + entry.count;

    if (!mergedFsasByBreed[breedKey]) mergedFsasByBreed[breedKey] = new Set();
    mergedFsasByBreed[breedKey].add(entry.fsa);

    speciesTotals[sp] = (speciesTotals[sp] || 0) + entry.count;
  }

  // GTA neighbourhoods only
  const allNbhs = Object.entries(fsaSummary)
    .filter(([fsa]) => gtaFsas.has(fsa))
    .map(([fsa, d]) => ({
      fsa,
      name: d.neighbourhood || fsa,
      label: `${d.neighbourhood || fsa} (${fsa})`
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // --- Autocomplete helper ---
  function setupAutocomplete(input, dropdown, getItems, onSelect, onClear) {
    let items = [];
    let activeIdx = -1;

    function render(filtered) {
      items = filtered;
      activeIdx = -1;
      if (!filtered.length) {
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
        return;
      }
      dropdown.innerHTML = filtered.map((item, i) =>
        `<div class="ac-option" data-index="${i}">${item.label}</div>`
      ).join('');
      dropdown.classList.add('open');

      dropdown.querySelectorAll('.ac-option').forEach(el => {
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          const idx = parseInt(el.dataset.index);
          onSelect(items[idx]);
        });
      });
    }

    function filter(query) {
      const all = getItems();
      if (!query) return all;
      const q = query.toLowerCase();
      const startsWith = all.filter(i => i.label.toLowerCase().startsWith(q));
      const includes = all.filter(i => !i.label.toLowerCase().startsWith(q) && i.label.toLowerCase().includes(q));
      return [...startsWith, ...includes];
    }

    input.addEventListener('input', () => {
      render(filter(input.value.trim()));
    });

    function clearAndShow() {
      input.value = '';
      input.classList.remove('has-value');
      onClear();
      render(filter(''));
    }

    input.addEventListener('focus', clearAndShow);
    input.addEventListener('click', clearAndShow);

    input.addEventListener('keydown', e => {
      if (!dropdown.classList.contains('open')) return;
      const options = dropdown.querySelectorAll('.ac-option');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, options.length - 1);
        options.forEach((o, i) => o.classList.toggle('ac-active', i === activeIdx));
        options[activeIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        options.forEach((o, i) => o.classList.toggle('ac-active', i === activeIdx));
        options[activeIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && items[activeIdx]) {
          onSelect(items[activeIdx]);
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.remove('open'), 150);
    });
  }

  // --- Breed autocomplete ---
  function getBreedItems() {
    const speciesMap = canonicalMap[currentSpecies] || {};
    return Object.entries(speciesMap)
      .sort((a, b) => a[1].displayName.localeCompare(b[1].displayName))
      .map(([canon, info]) => ({
        value: canon,
        label: toTitleCase(info.displayName)
      }));
  }

  setupAutocomplete(breedInput, breedDropdown, getBreedItems, item => {
    selectedBreed = item.value;
    breedInput.value = item.label;
    breedInput.classList.add('has-value');
    breedDropdown.classList.remove('open');
    tryShowResult();
  }, () => {
    selectedBreed = '';
    tryShowResult();
  });

  // --- Neighbourhood autocomplete ---
  function getNbhItems() {
    return allNbhs;
  }

  setupAutocomplete(nbhInput, nbhDropdown, getNbhItems, item => {
    selectedFsa = item.fsa;
    nbhInput.value = `${item.name} (${item.fsa})`;
    nbhInput.classList.add('has-value');
    nbhDropdown.classList.remove('open');
    tryShowResult();
  }, () => {
    selectedFsa = '';
    tryShowResult();
  });

  // --- Try to show result ---
  function tryShowResult() {
    if (!selectedBreed || !selectedFsa) {
      const missing = !selectedBreed && !selectedFsa ? 'a breed and neighbourhood' : !selectedBreed ? 'a breed' : 'a neighbourhood';
      resultDiv.innerHTML = `<div class="result-empty"><div class="result-empty-icon">?</div><p class="result-empty-text">Pick ${missing} to see your results.</p></div>`;
      return;
    }
    showResult();
  }

  // --- Show result ---
  function showResult() {
    const indexKey = `${currentSpecies}|${selectedBreed}|${selectedFsa}`;
    const entry = mergedIndex[indexKey];
    const neighbourhood = fsaSummary[selectedFsa]?.neighbourhood || selectedFsa;
    const speciesInfo = canonicalMap[currentSpecies]?.[selectedBreed];
    const breedDisplay = speciesInfo ? toTitleCase(speciesInfo.displayName) : selectedBreed;
    const speciesLabelPlural = currentSpecies === 'DOG' ? 'dogs' : 'cats';
    const accentColor = currentSpecies === 'DOG' ? 'var(--accent)' : 'var(--blue)';
    const chipBg = currentSpecies === 'DOG' ? 'rgba(235, 94, 40, 0.12)' : 'rgba(59, 130, 180, 0.12)';

    const breedKey = `${currentSpecies}|${selectedBreed}`;
    const citywideCount = mergedBreedTotals[breedKey] || 0;
    const totalForSpecies = speciesTotals[currentSpecies] || 1;
    const citywideShare = ((citywideCount / totalForSpecies) * 100).toFixed(1);
    const fsasWithBreed = (mergedFsasByBreed[breedKey] || new Set()).size;
    const totalNbhs = allNbhs.length;

    if (entry) {
      const localCount = entry.count;
      const totalInFsa = currentSpecies === 'DOG'
        ? (fsaSummary[selectedFsa]?.dog_count || 0)
        : (fsaSummary[selectedFsa]?.cat_count || 0);
      const localShare = totalInFsa ? ((localCount / totalInFsa) * 100).toFixed(1) : '0';

      let rarityLabel, rarityDesc;
      const pct = entry.rarity_percentile || 0;
      if (pct >= 95) {
        rarityLabel = 'Unicorn';
        rarityDesc = `Rarer than ${pct}% of breeds here. A true original.`;
      } else if (pct >= 80) {
        rarityLabel = 'Rare';
        rarityDesc = `Rarer than ${pct}% of breeds in this neighbourhood.`;
      } else if (pct >= 50) {
        rarityLabel = 'Uncommon';
        rarityDesc = `More unusual than ${pct}% of breeds around here.`;
      } else if (pct >= 20) {
        rarityLabel = 'Common';
        rarityDesc = `A familiar face — more popular than ${100 - pct}% of breeds here.`;
      } else {
        rarityLabel = 'Everywhere';
        rarityDesc = `One of the most popular breeds in this neighbourhood.`;
      }

      resultDiv.innerHTML = `
        <div class="result-filled">
          <div class="result-breed" style="color: ${accentColor}">${breedDisplay}</div>
          <div class="result-location">in ${neighbourhood}</div>
          <div class="result-rarity-badge" style="background: ${chipBg}; color: ${accentColor}">
            ${rarityLabel}
          </div>
          <p class="result-desc">${rarityDesc}</p>
          <div class="result-stats">
            <div class="result-stat">
              <span class="result-stat-num" style="color: ${accentColor}">${localCount.toLocaleString()}</span>
              <span class="result-stat-label">${breedDisplay}${localCount !== 1 ? 's' : ''} in ${neighbourhood}</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-num" style="color: ${accentColor}">${localShare}%</span>
              <span class="result-stat-label">of ${speciesLabelPlural} here</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-num" style="color: ${accentColor}">${citywideCount.toLocaleString()}</span>
              <span class="result-stat-label">across Toronto</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-num" style="color: ${accentColor}">${citywideShare}%</span>
              <span class="result-stat-label">of all ${speciesLabelPlural}</span>
            </div>
          </div>
          <div class="result-footer">
            Found in <strong style="color: ${accentColor}">${fsasWithBreed}</strong> of ${totalNbhs} neighbourhoods
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="result-filled">
          <div class="result-breed" style="color: ${accentColor}">${breedDisplay}</div>
          <div class="result-location">in ${neighbourhood}</div>
          <div class="result-rarity-badge" style="background: ${chipBg}; color: ${accentColor}">
            Not Found
          </div>
          <p class="result-desc">
            No licensed ${breedDisplay}${breedDisplay.endsWith('s') ? '' : 's'} in ${neighbourhood}. ${citywideCount > 0 ? `There are ${citywideCount.toLocaleString()} across Toronto in ${fsasWithBreed} neighbourhood${fsasWithBreed !== 1 ? 's' : ''}.` : `This breed doesn't appear in Toronto's registry.`}
          </p>
        </div>
      `;
    }
  }

  // --- Species toggle ---
  toggleContainer?.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleContainer.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpecies = btn.dataset.value;
      selectedBreed = '';
      selectedFsa = '';
      breedInput.value = '';
      breedInput.classList.remove('has-value');
      nbhInput.value = '';
      nbhInput.classList.remove('has-value');
      resultDiv.innerHTML = `<div class="result-empty"><div class="result-empty-icon">?</div><p class="result-empty-text">Pick a breed and neighbourhood to see how rare your pet is.</p></div>`;
    });
  });
}
