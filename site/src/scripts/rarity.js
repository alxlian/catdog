export function initRarityLookup(breedList, fsaSummary) {
  const speciesSelect = document.getElementById('rarity-species');
  const breedSelect = document.getElementById('rarity-breed');
  const fsaSelect = document.getElementById('rarity-fsa');
  const resultDiv = document.getElementById('rarity-result');

  if (!speciesSelect || !breedSelect || !fsaSelect || !resultDiv) return;

  // Index breed list for fast lookup
  const index = {};
  for (const entry of breedList) {
    const key = `${entry.species}|${entry.breed}|${entry.fsa}`;
    index[key] = entry;
  }

  // Get unique breeds and FSAs per species
  const breedsBySpecies = {};
  const fsasBySpeciesBreed = {};
  for (const entry of breedList) {
    if (!breedsBySpecies[entry.species]) breedsBySpecies[entry.species] = new Set();
    breedsBySpecies[entry.species].add(entry.breed);

    const key = `${entry.species}|${entry.breed}`;
    if (!fsasBySpeciesBreed[key]) fsasBySpeciesBreed[key] = new Set();
    fsasBySpeciesBreed[key].add(entry.fsa);
  }

  speciesSelect.addEventListener('change', () => {
    const species = speciesSelect.value;
    breedSelect.innerHTML = '<option value="">Breed...</option>';
    fsaSelect.innerHTML = '<option value="">Neighbourhood (FSA)...</option>';
    fsaSelect.disabled = true;
    resultDiv.innerHTML = '';

    if (!species) {
      breedSelect.disabled = true;
      return;
    }

    const breeds = [...(breedsBySpecies[species] || [])].sort();
    breeds.forEach(b => {
      breedSelect.appendChild(new Option(b, b));
    });
    breedSelect.disabled = false;
  });

  breedSelect.addEventListener('change', () => {
    const species = speciesSelect.value;
    const breed = breedSelect.value;
    fsaSelect.innerHTML = '<option value="">Neighbourhood (FSA)...</option>';
    resultDiv.innerHTML = '';

    if (!breed) {
      fsaSelect.disabled = true;
      return;
    }

    const key = `${species}|${breed}`;
    const fsas = [...(fsasBySpeciesBreed[key] || [])].sort();
    fsas.forEach(fsa => {
      const neighbourhood = fsaSummary[fsa]?.neighbourhood || fsa;
      fsaSelect.appendChild(new Option(`${fsa} — ${neighbourhood}`, fsa));
    });
    fsaSelect.disabled = false;
  });

  fsaSelect.addEventListener('change', () => {
    const species = speciesSelect.value;
    const breed = breedSelect.value;
    const fsa = fsaSelect.value;

    if (!fsa) {
      resultDiv.innerHTML = '';
      return;
    }

    const key = `${species}|${breed}|${fsa}`;
    const entry = index[key];
    const neighbourhood = fsaSummary[fsa]?.neighbourhood || fsa;

    if (entry) {
      const pctText = entry.rarity_percentile > 0
        ? `That's rarer than <strong>${entry.rarity_percentile}%</strong> of breeds in your neighbourhood.`
        : `That's <strong>among the most common</strong> breeds in your neighbourhood.`;
      resultDiv.innerHTML = `
        <div class="stat-card" style="text-align:center">
          <p>There ${entry.count === 1 ? 'is' : 'are'} <strong>${entry.count}</strong> licensed ${breed}${entry.count !== 1 ? 's' : ''} in <strong>${fsa}</strong> (${neighbourhood}).</p>
          <p style="margin-top:0.5rem">${pctText}</p>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="stat-card">
          <p>No licensed ${breed}s found in ${fsa} (${neighbourhood}).</p>
          <p style="margin-top:0.5rem;color:var(--gray)">This breed may not be registered in this area.</p>
        </div>
      `;
    }
  });
}
