import { toTitleCase } from './utils.js';

export function initRarityLookup(breedList, fsaSummary) {
  const toggleContainer = document.getElementById('rarity-species-toggle');
  const breedSelect = document.getElementById('rarity-breed');
  const fsaSelect = document.getElementById('rarity-fsa');
  const resultDiv = document.getElementById('rarity-result');

  if (!breedSelect || !fsaSelect || !resultDiv) return;

  let currentSpecies = 'DOG';

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

  function populateBreeds() {
    breedSelect.innerHTML = '<option value="">Select a breed...</option>';
    fsaSelect.innerHTML = '<option value="">Select neighbourhood (FSA)...</option>';
    fsaSelect.disabled = true;
    resultDiv.innerHTML = '';

    const breeds = [...(breedsBySpecies[currentSpecies] || [])].sort();
    breeds.forEach(b => {
      breedSelect.appendChild(new Option(toTitleCase(b), b));
    });
    breedSelect.disabled = false;
  }

  // Toggle switch handler
  toggleContainer?.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleContainer.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpecies = btn.dataset.value;
      populateBreeds();
    });
  });

  breedSelect.addEventListener('change', () => {
    const breed = breedSelect.value;
    fsaSelect.innerHTML = '<option value="">Select neighbourhood (FSA)...</option>';
    resultDiv.innerHTML = '';

    if (!breed) {
      fsaSelect.disabled = true;
      return;
    }

    const key = `${currentSpecies}|${breed}`;
    const fsas = [...(fsasBySpeciesBreed[key] || [])].sort();
    fsas.forEach(fsa => {
      const neighbourhood = fsaSummary[fsa]?.neighbourhood || fsa;
      fsaSelect.appendChild(new Option(`${fsa} — ${neighbourhood}`, fsa));
    });
    fsaSelect.disabled = false;
  });

  fsaSelect.addEventListener('change', () => {
    const breed = breedSelect.value;
    const fsa = fsaSelect.value;

    if (!fsa) {
      resultDiv.innerHTML = '';
      return;
    }

    const key = `${currentSpecies}|${breed}|${fsa}`;
    const entry = index[key];
    const neighbourhood = fsaSummary[fsa]?.neighbourhood || fsa;
    const breedDisplay = toTitleCase(breed);

    if (entry) {
      const pctText = entry.rarity_percentile > 0
        ? `That's rarer than <strong>${entry.rarity_percentile}%</strong> of breeds in your neighbourhood.`
        : `That's <strong>among the most common</strong> breeds in your neighbourhood.`;
      resultDiv.innerHTML = `
        <div class="stat-card" style="text-align:center">
          <p>There ${entry.count === 1 ? 'is' : 'are'} <strong>${entry.count}</strong> licensed ${breedDisplay}${entry.count !== 1 ? 's' : ''} in <strong>${fsa}</strong> (${neighbourhood}).</p>
          <p style="margin-top:0.5rem">${pctText}</p>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="stat-card">
          <p>No licensed ${breedDisplay}s found in ${fsa} (${neighbourhood}).</p>
          <p style="margin-top:0.5rem;color:var(--gray)">This breed may not be registered in this area.</p>
        </div>
      `;
    }
  });

  // Initial population
  populateBreeds();
}
