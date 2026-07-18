# The Pets of Toronto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static data site visualizing Toronto's licensed pet data with an interactive FSA map, breed/name trends, and a rarity lookup tool.

**Architecture:** Two-stage build — Python data pipeline pulls and aggregates CKAN API data into JSON files, Astro static site consumes those JSON files and renders interactive D3 visualizations. Deployed to Vercel.

**Tech Stack:** Python 3.12 (data pipeline), Astro (site framework), D3.js v7 (map + charts), Vanilla CSS, Vercel (hosting)

**Spec:** `docs/superpowers/specs/2026-07-17-pets-of-toronto-design.md`

---

## File Structure

```
catdog/
  pipeline/
    run.py                  # Entry point — orchestrates all pipeline steps
    pull.py                 # CKAN API fetcher with local CSV cache
    names.py                # Names CSV loader and processor
    aggregate.py            # Core aggregation: FSA summaries, breed trends, citywide stats
    rarity.py               # Rarity percentile calculation for breed-list.json
    reference/
      census-fsa-population.csv   # StatCan 2021 Census population by FSA (manually sourced)
      fsa-neighbourhoods.csv      # FSA → neighbourhood name crosswalk
      toronto-fsa.geojson         # Toronto FSA boundary polygons (manually sourced from StatCan)
    cache/                        # Gitignored — raw API data cache
      licensed-dogs-cats.csv
    requirements.txt              # Python dependencies (requests)
    tests/
      test_pull.py
      test_names.py
      test_aggregate.py
      test_rarity.py

  site/                     # Astro project root
    astro.config.mjs
    package.json
    src/
      data/                 # Pipeline JSON output (committed)
        fsa-summary.json
        fsa-geo.json
        breed-trends.json
        names.json
        citywide.json
        breed-list.json
        metadata.json
      pages/
        index.astro         # Single-page layout assembling all sections
      layouts/
        Base.astro          # HTML head, fonts, global styles, nav, footer
      components/
        Nav.astro           # Sticky top nav with section anchors
        Hero.astro          # Title, subtitle, total count, species donut
        Neighbourhoods.astro # Map container + disclaimer
        BreedTrends.astro   # Breed trend charts container
        Names.astro         # Names leaderboard + search container
        TypicalPet.astro    # Stat cards section
        RarityLookup.astro  # Interactive lookup form + result
        Footer.astro        # Data sources, disclaimers, timestamp
      scripts/
        donut.js            # D3 species split donut chart
        map.js              # D3 choropleth FSA map + tooltip
        breed-chart.js      # D3 breed trend line charts + rising/declining bars
        name-chart.js       # D3 name bump chart + sparklines
        rarity.js           # Rarity lookup form logic
        nav.js              # Scroll spy + smooth scroll
      styles/
        global.css          # CSS custom properties, typography, base styles
        components.css      # Shared component patterns (cards, tooltips, etc.)

  .gitignore
  vercel.json               # Vercel config pointing to site/ as project root
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `.gitignore`, `pipeline/__init__.py`, `pipeline/tests/__init__.py`, `site/package.json`, `site/astro.config.mjs`

- [ ] **Step 1: Initialize git repo**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
# Python
__pycache__/
*.pyc
pipeline/cache/

# Node
site/node_modules/
site/dist/
site/.astro/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Create pipeline package structure**

Create `pipeline/__init__.py` and `pipeline/tests/__init__.py` as empty files.

Create `pipeline/requirements.txt`:
```
requests
```

- [ ] **Step 4: Scaffold Astro project**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog
mkdir -p site/src/data site/src/pages site/src/layouts site/src/components site/src/scripts site/src/styles site/public
```

Create `site/package.json`:
```json
{
  "name": "pets-of-toronto",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.10.0",
    "d3": "^7.9.0"
  }
}
```

Create `site/astro.config.mjs`:
```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
});
```

- [ ] **Step 5: Install Astro dependencies**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog/site
npm install
```

- [ ] **Step 6: Create favicon**

Create `site/public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <text y="28" font-size="28">🐾</text>
</svg>
```

- [ ] **Step 7: Create Vercel config**

Create `vercel.json` at project root:
```json
{
  "buildCommand": "cd site && npm run build",
  "outputDirectory": "site/dist",
  "installCommand": "cd site && npm install"
}
```

- [ ] **Step 8: Commit scaffolding**

```bash
git add -A
git commit -m "chore: scaffold project structure — pipeline + Astro site"
```

---

## Task 2: Pipeline — CKAN Data Puller

**Files:**
- Create: `pipeline/pull.py`, `pipeline/tests/test_pull.py`

- [ ] **Step 1: Write the failing test**

Create `pipeline/tests/test_pull.py`:
```python
import os
import csv
from unittest.mock import patch, MagicMock
from pipeline.pull import pull_license_data

def test_pull_license_data_fetches_and_caches(tmp_path):
    """pull_license_data fetches records from CKAN API and writes CSV cache."""
    cache_file = tmp_path / "licensed-dogs-cats.csv"

    fake_records = [
        {"_id": 1, "Year": 2023, "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
        {"_id": 2, "Year": 2024, "FSA": "M4C", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "DOMESTIC SH"},
    ]
    fake_response = {
        "result": {
            "records": fake_records,
            "total": 2,
        }
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = fake_response

    with patch("pipeline.pull.requests.get", return_value=mock_resp) as mock_get:
        records = pull_license_data(str(cache_file))

    assert len(records) == 2
    assert records[0]["FSA"] == "M5V"
    assert os.path.exists(cache_file)

    # Verify cached CSV has correct contents
    with open(cache_file) as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    assert len(rows) == 2
    assert rows[1]["PRIMARY_BREED"] == "DOMESTIC SH"


def test_pull_license_data_uses_cache_if_exists(tmp_path):
    """pull_license_data reads from cache CSV if it already exists."""
    cache_file = tmp_path / "licensed-dogs-cats.csv"
    cache_file.write_text("_id,Year,FSA,ANIMAL_TYPE,PRIMARY_BREED\n1,2023,M5V,DOG,PUG\n")

    with patch("pipeline.pull.requests.get") as mock_get:
        records = pull_license_data(str(cache_file))

    mock_get.assert_not_called()
    assert len(records) == 1
    assert records[0]["PRIMARY_BREED"] == "PUG"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog
python -m pytest pipeline/tests/test_pull.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.pull'`

- [ ] **Step 3: Write implementation**

Create `pipeline/pull.py`:
```python
import csv
import os
import requests

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca"
RESOURCE_ID = "4a773296-7225-442d-9929-074549b2ccc0"
FIELDS = ["_id", "Year", "FSA", "ANIMAL_TYPE", "PRIMARY_BREED"]
PAGE_SIZE = 32000


def pull_license_data(cache_path: str) -> list[dict]:
    """Fetch license data from CKAN API, or read from cache if it exists."""
    if os.path.exists(cache_path):
        return _read_cache(cache_path)

    records = _fetch_all_records()
    _write_cache(cache_path, records)
    return records


def _fetch_all_records() -> list[dict]:
    """Page through CKAN datastore API and collect all records."""
    url = f"{CKAN_BASE}/api/3/action/datastore_search"
    records = []
    offset = 0

    while True:
        params = {"id": RESOURCE_ID, "limit": PAGE_SIZE, "offset": offset}
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        result = resp.json()["result"]
        batch = result["records"]
        if not batch:
            break
        records.extend(batch)
        offset += len(batch)
        if offset >= result["total"]:
            break

    return records


def _write_cache(path: str, records: list[dict]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for r in records:
            writer.writerow({k: r[k] for k in FIELDS})


def _read_cache(path: str) -> list[dict]:
    with open(path) as f:
        return list(csv.DictReader(f))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest pipeline/tests/test_pull.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/pull.py pipeline/tests/test_pull.py
git commit -m "feat(pipeline): add CKAN data puller with CSV caching"
```

---

## Task 3: Pipeline — Names Loader

**Files:**
- Create: `pipeline/names.py`, `pipeline/tests/test_names.py`

- [ ] **Step 1: Write the failing test**

Create `pipeline/tests/test_names.py`:
```python
from pipeline.names import load_names, aggregate_names

def test_load_names_parses_csv(tmp_path):
    csv_file = tmp_path / "names.csv"
    csv_file.write_text(
        "_id,ANIMAL_TYPE,Year,Rank,ANIMAL_NAME,AnimalCnt\n"
        "1,CAT,2020,1,CHARLIE,123\n"
        "2,DOG,2020,1,BUDDY,200\n"
        "3,CAT,2021,1,LUNA,130\n"
    )
    records = load_names(str(csv_file))
    assert len(records) == 3
    assert records[0]["ANIMAL_NAME"] == "CHARLIE"
    assert records[0]["Year"] == 2020
    assert records[0]["AnimalCnt"] == 123


def test_aggregate_names_produces_output_structure():
    records = [
        {"ANIMAL_TYPE": "CAT", "Year": 2020, "Rank": 1, "ANIMAL_NAME": "CHARLIE", "AnimalCnt": 123},
        {"ANIMAL_TYPE": "CAT", "Year": 2020, "Rank": 2, "ANIMAL_NAME": "LUNA", "AnimalCnt": 100},
        {"ANIMAL_TYPE": "CAT", "Year": 2021, "Rank": 1, "ANIMAL_NAME": "LUNA", "AnimalCnt": 130},
        {"ANIMAL_TYPE": "DOG", "Year": 2020, "Rank": 1, "ANIMAL_NAME": "BUDDY", "AnimalCnt": 200},
    ]
    result = aggregate_names(records)

    # Structure: {species: {name: [{year, rank, count}, ...]}}
    assert "CAT" in result
    assert "DOG" in result
    assert "LUNA" in result["CAT"]
    assert len(result["CAT"]["LUNA"]) == 2
    assert result["CAT"]["LUNA"][0] == {"year": 2020, "rank": 2, "count": 100}
    assert result["CAT"]["LUNA"][1] == {"year": 2021, "rank": 1, "count": 130}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest pipeline/tests/test_names.py -v
```
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `pipeline/names.py`:
```python
import csv


def load_names(csv_path: str) -> list[dict]:
    """Load and parse the names CSV, casting types."""
    records = []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            records.append({
                "ANIMAL_TYPE": row["ANIMAL_TYPE"],
                "Year": int(row["Year"]),
                "Rank": int(row["Rank"]),
                "ANIMAL_NAME": row["ANIMAL_NAME"],
                "AnimalCnt": int(row["AnimalCnt"]),
            })
    return records


def aggregate_names(records: list[dict]) -> dict:
    """Aggregate name records into {species: {name: [{year, rank, count}, ...]}}."""
    result = {}
    for r in records:
        species = r["ANIMAL_TYPE"]
        name = r["ANIMAL_NAME"]
        if species not in result:
            result[species] = {}
        if name not in result[species]:
            result[species][name] = []
        result[species][name].append({
            "year": r["Year"],
            "rank": r["Rank"],
            "count": r["AnimalCnt"],
        })

    # Sort each name's entries by year
    for species in result:
        for name in result[species]:
            result[species][name].sort(key=lambda x: x["year"])

    return result
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest pipeline/tests/test_names.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/names.py pipeline/tests/test_names.py
git commit -m "feat(pipeline): add names CSV loader and aggregator"
```

---

## Task 4: Pipeline — Core Aggregation (FSA Summaries, Breed Trends, Citywide)

**Files:**
- Create: `pipeline/aggregate.py`, `pipeline/tests/test_aggregate.py`

- [ ] **Step 1: Write failing tests**

Create `pipeline/tests/test_aggregate.py`:
```python
from pipeline.aggregate import (
    aggregate_fsa_summary,
    aggregate_breed_trends,
    aggregate_citywide,
)

SAMPLE_RECORDS = [
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "BEAGLE"},
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "DOMESTIC SH"},
    {"Year": "2023", "FSA": "M4C", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "GOLDEN RETR"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "DOMESTIC SH"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "SIAMESE"},
]

NEIGHBOURHOODS = {"M5V": "King West", "M4C": "East Danforth"}
POPULATION = {"M5V": 25000, "M4C": 18000}


def test_fsa_summary_counts():
    result = aggregate_fsa_summary(SAMPLE_RECORDS, NEIGHBOURHOODS, POPULATION)
    m5v = result["M5V"]
    assert m5v["neighbourhood"] == "King West"
    assert m5v["dog_count"] > 0
    assert m5v["cat_count"] > 0
    assert "top_breeds" in m5v
    assert "rare_breeds" in m5v
    assert "signature_breed" in m5v
    assert "per_capita_rate" in m5v


def test_fsa_summary_signature_breed():
    # BEAGLE only appears in M5V — should be its signature dog breed
    result = aggregate_fsa_summary(SAMPLE_RECORDS, NEIGHBOURHOODS, POPULATION)
    m5v = result["M5V"]
    # Signature breed should exist for DOG
    assert "DOG" in m5v["signature_breed"]


def test_fsa_summary_per_capita():
    result = aggregate_fsa_summary(SAMPLE_RECORDS, NEIGHBOURHOODS, POPULATION)
    m5v = result["M5V"]
    # M5V has 7 total licenses, population 25000
    expected = 7 / 25000
    assert abs(m5v["per_capita_rate"] - expected) < 0.0001


def test_breed_trends():
    result = aggregate_breed_trends(SAMPLE_RECORDS)
    # Structure: {species: {breed: [{year, count, share, yoy_change}, ...]}}
    assert "DOG" in result
    assert "PUG" in result["DOG"]
    pug_entries = result["DOG"]["PUG"]
    assert len(pug_entries) >= 1
    assert "year" in pug_entries[0]
    assert "count" in pug_entries[0]
    assert "share" in pug_entries[0]


def test_citywide():
    name_records = [
        {"ANIMAL_TYPE": "CAT", "Year": 2024, "Rank": 1, "ANIMAL_NAME": "LUNA", "AnimalCnt": 130},
        {"ANIMAL_TYPE": "DOG", "Year": 2024, "Rank": 1, "ANIMAL_NAME": "BUDDY", "AnimalCnt": 200},
    ]
    result = aggregate_citywide(SAMPLE_RECORDS, name_records)
    assert result["total_licenses"] == len(SAMPLE_RECORDS)
    assert "species_split" in result
    assert "top_breed" in result
    assert "top_name" in result
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest pipeline/tests/test_aggregate.py -v
```
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `pipeline/aggregate.py`:
```python
from collections import Counter, defaultdict


def aggregate_fsa_summary(
    records: list[dict],
    neighbourhoods: dict[str, str],
    population: dict[str, int],
) -> dict:
    """Build per-FSA summary: counts, top/rare/signature breeds, per-capita rate."""
    # Group records by FSA
    by_fsa = defaultdict(list)
    for r in records:
        by_fsa[r["FSA"]].append(r)

    # Citywide breed shares (for signature breed calculation)
    citywide_breed_count = defaultdict(lambda: defaultdict(int))
    citywide_species_total = defaultdict(int)
    for r in records:
        citywide_breed_count[r["ANIMAL_TYPE"]][r["PRIMARY_BREED"]] += 1
        citywide_species_total[r["ANIMAL_TYPE"]] += 1

    result = {}
    for fsa, fsa_records in by_fsa.items():
        species_counts = Counter(r["ANIMAL_TYPE"] for r in fsa_records)
        dog_count = species_counts.get("DOG", 0)
        cat_count = species_counts.get("CAT", 0)
        total = dog_count + cat_count

        # Breed counts per species in this FSA
        breed_counts = defaultdict(lambda: defaultdict(int))
        for r in fsa_records:
            breed_counts[r["ANIMAL_TYPE"]][r["PRIMARY_BREED"]] += 1

        # Top 3 and bottom 5 breeds per species
        top_breeds = {}
        rare_breeds = {}
        for species in ["DOG", "CAT"]:
            bc = breed_counts[species]
            if not bc:
                top_breeds[species] = []
                rare_breeds[species] = []
                continue
            sorted_breeds = sorted(bc.items(), key=lambda x: -x[1])
            top_breeds[species] = [
                {"breed": b, "count": c} for b, c in sorted_breeds[:3]
            ]
            # Rare breeds: bottom 5, no minimum threshold
            rare_breeds[species] = [
                {"breed": b, "count": c}
                for b, c in sorted_breeds[-5:]
            ]

        # Signature breed per species
        signature_breed = {}
        for species in ["DOG", "CAT"]:
            bc = breed_counts[species]
            species_total_fsa = species_counts.get(species, 0)
            if not species_total_fsa or not citywide_species_total[species]:
                continue
            best_breed = None
            best_ratio = 0
            for breed, count in bc.items():
                if count < 3:
                    continue  # Min threshold for signature only
                fsa_share = count / species_total_fsa
                city_share = (
                    citywide_breed_count[species][breed]
                    / citywide_species_total[species]
                )
                if city_share == 0:
                    continue
                ratio = fsa_share / city_share
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_breed = breed
            if best_breed:
                signature_breed[species] = {
                    "breed": best_breed,
                    "ratio": round(best_ratio, 2),
                }

        # Per-capita rate
        pop = population.get(fsa)
        per_capita = total / pop if pop else None

        result[fsa] = {
            "neighbourhood": neighbourhoods.get(fsa, fsa),
            "dog_count": dog_count,
            "cat_count": cat_count,
            "total": total,
            "dog_ratio": round(dog_count / total, 3) if total else 0,
            "top_breeds": top_breeds,
            "rare_breeds": rare_breeds,
            "signature_breed": signature_breed,
            "per_capita_rate": round(per_capita, 6) if per_capita else None,
        }

    return result


def aggregate_breed_trends(records: list[dict]) -> dict:
    """Build breed trends: {species: {breed: [{year, count, share, yoy_change}]}}."""
    # Count by (species, breed, year)
    counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    year_totals = defaultdict(lambda: defaultdict(int))

    for r in records:
        species = r["ANIMAL_TYPE"]
        breed = r["PRIMARY_BREED"]
        year = int(r["Year"])
        counts[species][breed][year] += 1
        year_totals[species][year] += 1

    result = {}
    for species in counts:
        result[species] = {}
        for breed in counts[species]:
            years_data = sorted(counts[species][breed].items())
            entries = []
            prev_share = None
            for year, count in years_data:
                total = year_totals[species][year]
                share = round(count / total, 6) if total else 0
                yoy = round(share - prev_share, 6) if prev_share is not None else None
                entries.append({
                    "year": year,
                    "count": count,
                    "share": share,
                    "yoy_change": yoy,
                })
                prev_share = share
            result[species][breed] = entries

    return result


def aggregate_citywide(records: list[dict], name_records: list[dict]) -> dict:
    """Build independent citywide stats."""
    total = len(records)
    species_counts = Counter(r["ANIMAL_TYPE"] for r in records)
    breed_counts = defaultdict(lambda: Counter())
    for r in records:
        breed_counts[r["ANIMAL_TYPE"]][r["PRIMARY_BREED"]] += 1

    top_breed = {}
    for species in ["DOG", "CAT"]:
        if breed_counts[species]:
            breed, count = breed_counts[species].most_common(1)[0]
            top_breed[species] = {"breed": breed, "count": count}

    # Top name from most recent year in name data
    latest_year = max(r["Year"] for r in name_records) if name_records else None
    top_name = {}
    if latest_year:
        for r in name_records:
            if r["Year"] == latest_year and r["Rank"] == 1:
                top_name[r["ANIMAL_TYPE"]] = {
                    "name": r["ANIMAL_NAME"],
                    "count": r["AnimalCnt"],
                    "year": latest_year,
                }

    return {
        "total_licenses": total,
        "species_split": {
            "DOG": species_counts.get("DOG", 0),
            "CAT": species_counts.get("CAT", 0),
        },
        "top_breed": top_breed,
        "top_name": top_name,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest pipeline/tests/test_aggregate.py -v
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/aggregate.py pipeline/tests/test_aggregate.py
git commit -m "feat(pipeline): add FSA summary, breed trends, and citywide aggregation"
```

---

## Task 5: Pipeline — Rarity Percentile

**Files:**
- Create: `pipeline/rarity.py`, `pipeline/tests/test_rarity.py`

- [ ] **Step 1: Write the failing test**

Create `pipeline/tests/test_rarity.py`:
```python
from pipeline.rarity import compute_breed_list

def test_rarity_percentile():
    records = [
        {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
        {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
        {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
        {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "BEAGLE"},
        {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "SAMOYED"},
    ]
    result = compute_breed_list(records)
    # Result is a list of {species, breed, fsa, count, rarity_percentile}
    assert len(result) == 3

    by_breed = {r["breed"]: r for r in result}
    # PUG has count=3, BEAGLE=1, SAMOYED=1
    # PUG: 0 breeds have count > 3, so percentile = 0/3 = 0%
    # BEAGLE: 1 breed (PUG) has count > 1, so percentile = 1/3 = 33.3%
    # SAMOYED: same as BEAGLE
    assert by_breed["PUG"]["count"] == 3
    assert by_breed["PUG"]["rarity_percentile"] == 0.0
    assert abs(by_breed["BEAGLE"]["rarity_percentile"] - 33.3) < 1


def test_rarity_multiple_fsas():
    records = [
        {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
        {"Year": "2023", "FSA": "M4C", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    ]
    result = compute_breed_list(records)
    # Each FSA gets its own entry
    assert len(result) == 2
    fsas = {r["fsa"] for r in result}
    assert fsas == {"M5V", "M4C"}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest pipeline/tests/test_rarity.py -v
```
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `pipeline/rarity.py`:
```python
from collections import defaultdict


def compute_breed_list(records: list[dict]) -> list[dict]:
    """Compute all (species, breed, FSA) combos with counts and rarity percentiles.

    Rarity percentile = % of breed combos in that FSA+species with count
    strictly greater than this breed's count. High % = rare breed.
    """
    # Count by (FSA, species, breed)
    counts = defaultdict(int)
    for r in records:
        key = (r["FSA"], r["ANIMAL_TYPE"], r["PRIMARY_BREED"])
        counts[key] += 1

    # Group counts by (FSA, species) for percentile calculation
    fsa_species_counts = defaultdict(list)
    for (fsa, species, breed), count in counts.items():
        fsa_species_counts[(fsa, species)].append((breed, count))

    result = []
    for (fsa, species), breeds in fsa_species_counts.items():
        total_breeds = len(breeds)
        for breed, count in breeds:
            # % of breeds with count strictly greater than this one
            higher = sum(1 for _, c in breeds if c > count)
            percentile = round(higher / total_breeds * 100, 1)
            result.append({
                "fsa": fsa,
                "species": species,
                "breed": breed,
                "count": count,
                "rarity_percentile": percentile,
            })

    return result
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest pipeline/tests/test_rarity.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/rarity.py pipeline/tests/test_rarity.py
git commit -m "feat(pipeline): add rarity percentile calculation"
```

---

## Task 6: Pipeline — Reference Data (Census + Neighbourhood Crosswalk)

**Files:**
- Create: `pipeline/reference/census-fsa-population.csv`, `pipeline/reference/fsa-neighbourhoods.csv`

This task requires manually sourcing two reference files. The pipeline code will read them as simple CSVs.

- [ ] **Step 1: Source Census FSA population data**

Search for StatCan 2021 Census population by FSA. Expected format for `pipeline/reference/census-fsa-population.csv`:
```csv
FSA,population
M1B,57890
M1C,34210
...
```

Use web search to find the StatCan table (Table 98-10-0018-01 or similar), filter to Toronto M-prefix FSAs, and save as CSV. This is a manual step — download, filter to M-prefix rows, save with just `FSA,population` columns.

- [ ] **Step 2: Build FSA→neighbourhood crosswalk**

Search for an existing Toronto FSA-to-neighbourhood mapping. Expected format for `pipeline/reference/fsa-neighbourhoods.csv`:
```csv
FSA,neighbourhood
M1B,Scarborough - Rouge
M1C,Scarborough - Highland Creek
M5V,King West / CityPlace
...
```

If no clean existing source is found, build from Canada Post FSA descriptions + local knowledge. Must cover all ~98 Toronto M-prefix FSAs.

- [ ] **Step 3: Verify both files have expected structure**

```bash
head -5 pipeline/reference/census-fsa-population.csv
head -5 pipeline/reference/fsa-neighbourhoods.csv
wc -l pipeline/reference/census-fsa-population.csv
wc -l pipeline/reference/fsa-neighbourhoods.csv
```

Both should have ~98 data rows (one per Toronto FSA) plus header.

- [ ] **Step 4: Commit reference data**

```bash
git add pipeline/reference/
git commit -m "feat(pipeline): add Census FSA population and neighbourhood crosswalk reference data"
```

---

## Task 7: Pipeline — FSA GeoJSON

**Files:**
- Create: `pipeline/reference/toronto-fsa.geojson`

StatCan publishes FSA boundary files. We need a GeoJSON of Toronto's ~98 M-prefix FSA polygons. This is a static reference file committed to the repo — it does not change with pipeline runs.

- [ ] **Step 1: Download and filter StatCan FSA boundaries**

Download the national FSA boundary file from StatCan (2021 Census, Forward Sortation Area shapefile). Filter to M-prefix FSAs only. Convert to GeoJSON.

Approach — use Python with requests to download, then filter:
```python
import json
import requests
import zipfile
import io

# StatCan 2021 Census FSA boundary file (GeoJSON format)
# Search the StatCan open data portal for "Forward Sortation Area Boundary File"
# Direct download URL may change — if it fails, manually download from:
# https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21
# Select: Forward Sortation Areas, GeoJSON format

# Alternative: use the Open Canada CKAN portal to find the FSA boundary dataset
# and download the GeoJSON resource.

# Once you have the national GeoJSON file:
with open('national-fsa.geojson') as f:
    national = json.load(f)

toronto_features = [
    feat for feat in national['features']
    if feat['properties'].get('CFSAUID', '').startswith('M')
]

toronto_geo = {
    'type': 'FeatureCollection',
    'features': toronto_features
}

with open('pipeline/reference/toronto-fsa.geojson', 'w') as f:
    json.dump(toronto_geo, f)

print(f'Wrote {len(toronto_features)} Toronto FSA features')
```

If Python GeoJSON processing proves difficult, use `mapshaper` CLI or QGIS to filter and export. The key requirement: a GeoJSON FeatureCollection where each feature has `properties.CFSAUID` set to the FSA code (e.g., "M5V").

- [ ] **Step 2: Verify the GeoJSON**

```bash
python -c "import json; d=json.load(open('pipeline/reference/toronto-fsa.geojson')); print(len(d['features']), 'features'); print([f['properties']['CFSAUID'] for f in d['features'][:5]])"
```

Expected: ~98 features, all starting with "M".

- [ ] **Step 3: Commit**

```bash
git add pipeline/reference/toronto-fsa.geojson
git commit -m "feat(pipeline): add Toronto FSA boundary GeoJSON from StatCan"
```

---

## Task 8: Pipeline — Run Orchestrator

**Files:**
- Create: `pipeline/run.py`

- [ ] **Step 1: Write run.py**

Create `pipeline/run.py`:
```python
"""Pipeline entry point. Orchestrates data pulling, aggregation, and JSON output."""

import json
import os
import sys
from datetime import datetime, timezone

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.pull import pull_license_data
from pipeline.names import load_names, aggregate_names
from pipeline.aggregate import aggregate_fsa_summary, aggregate_breed_trends, aggregate_citywide
from pipeline.rarity import compute_breed_list

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(PROJECT_ROOT, "pipeline", "cache")
REFERENCE_DIR = os.path.join(PROJECT_ROOT, "pipeline", "reference")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "site", "src", "data")
NAMES_CSV = os.path.join(PROJECT_ROOT, "Licensed Dog and Cat Names Since 2020.csv")


def load_csv_map(path: str, key_col: str, val_col: str) -> dict:
    """Load a 2-column CSV into a dict."""
    import csv
    result = {}
    with open(path) as f:
        for row in csv.DictReader(f):
            result[row[key_col]] = row[val_col]
    return result


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Pulling license data...")
    cache_path = os.path.join(CACHE_DIR, "licensed-dogs-cats.csv")
    records = pull_license_data(cache_path)
    print(f"  {len(records)} records loaded")

    print("Loading names data...")
    name_records_raw = load_names(NAMES_CSV)
    print(f"  {len(name_records_raw)} name records loaded")

    print("Loading reference data...")
    neighbourhoods = load_csv_map(
        os.path.join(REFERENCE_DIR, "fsa-neighbourhoods.csv"), "FSA", "neighbourhood"
    )
    population_raw = load_csv_map(
        os.path.join(REFERENCE_DIR, "census-fsa-population.csv"), "FSA", "population"
    )
    population = {k: int(v) for k, v in population_raw.items()}
    print(f"  {len(neighbourhoods)} FSA neighbourhoods, {len(population)} FSA populations")

    print("Aggregating FSA summaries...")
    fsa_summary = aggregate_fsa_summary(records, neighbourhoods, population)
    _write_json(os.path.join(OUTPUT_DIR, "fsa-summary.json"), fsa_summary)

    print("Aggregating breed trends...")
    breed_trends = aggregate_breed_trends(records)
    _write_json(os.path.join(OUTPUT_DIR, "breed-trends.json"), breed_trends)

    print("Aggregating names...")
    names_output = aggregate_names(name_records_raw)
    _write_json(os.path.join(OUTPUT_DIR, "names.json"), names_output)

    print("Computing citywide stats...")
    citywide = aggregate_citywide(records, name_records_raw)
    _write_json(os.path.join(OUTPUT_DIR, "citywide.json"), citywide)

    print("Computing breed rarity list...")
    breed_list = compute_breed_list(records)
    _write_json(os.path.join(OUTPUT_DIR, "breed-list.json"), breed_list)

    print("Copying FSA geo data...")
    geo_src = os.path.join(REFERENCE_DIR, "toronto-fsa.geojson")
    if os.path.exists(geo_src):
        import shutil
        shutil.copy2(geo_src, os.path.join(OUTPUT_DIR, "fsa-geo.json"))
    else:
        print("  WARNING: toronto-fsa.geojson not found in reference/, skipping")

    print("Writing metadata...")
    years = sorted(set(int(r["Year"]) for r in records))
    metadata = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "year_range": [years[0], years[-1]],
        "total_records": len(records),
        "disclaimers": [
            "Dog/cat dominance reflects licensing behavior, not confirmed pet population. Cat licensing compliance is generally lower than dog compliance.",
            "Per-capita rate uses 2021 Census population against 2023+ license data — there is a year mismatch.",
            "All data is self-reported voluntary-compliance licensing, not a full census of pets in the city.",
        ],
    }
    _write_json(os.path.join(OUTPUT_DIR, "metadata.json"), metadata)

    print("Pipeline complete!")


def _write_json(path: str, data) -> None:
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  Wrote {path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run all pipeline tests**

```bash
python -m pytest pipeline/tests/ -v
```
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add pipeline/run.py
git commit -m "feat(pipeline): add run.py orchestrator"
```

---

## Task 9: Pipeline — Run Against Live Data

**Files:**
- Modify: potentially fix issues in any pipeline module
- Output: `site/src/data/*.json`

- [ ] **Step 1: Run the pipeline (without geo data)**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog
python pipeline/run.py
```

This will pull ~230K records from the CKAN API (may take 1-2 minutes on first run), aggregate, and write JSON files. Expect a warning about missing geo data.

- [ ] **Step 2: Verify output files exist and look correct**

```bash
ls -la site/src/data/
python -c "import json; d=json.load(open('site/src/data/fsa-summary.json')); print(len(d), 'FSAs'); print(list(d.keys())[:5])"
python -c "import json; d=json.load(open('site/src/data/citywide.json')); print(json.dumps(d, indent=2))"
python -c "import json; d=json.load(open('site/src/data/metadata.json')); print(json.dumps(d, indent=2))"
```

- [ ] **Step 3: Fix any issues found and re-run**

Iterate until all JSON files produce valid, sensible output.

- [ ] **Step 4: Commit generated data**

```bash
git add site/src/data/
git commit -m "feat(pipeline): add generated JSON data files from live CKAN data"
```

---

## Task 10: Site — Base Layout, Global Styles, and Nav

**Files:**
- Create: `site/src/styles/global.css`, `site/src/styles/components.css`, `site/src/layouts/Base.astro`, `site/src/components/Nav.astro`, `site/src/components/Footer.astro`, `site/src/pages/index.astro`

- [ ] **Step 1: Create global.css**

Create `site/src/styles/global.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --navy: #1A2B4A;
  --red: #C41E3A;
  --blue: #3B7EA1;
  --bg: #FAFAF8;
  --gray: #6B7280;
  --gray-light: #E5E7EB;
  --font: 'Inter', system-ui, sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 4rem;
}

body {
  font-family: var(--font);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--navy);
  background: var(--bg);
}

h1, h2, h3 {
  line-height: 1.2;
  font-weight: 700;
}

h1 { font-size: 3rem; }
h2 { font-size: 2rem; margin-bottom: 1rem; }
h3 { font-size: 1.25rem; }

section {
  max-width: 72rem;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

a {
  color: var(--blue);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

@media (max-width: 768px) {
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  section { padding: 2rem 1rem; }
}
```

- [ ] **Step 2: Create components.css**

Create `site/src/styles/components.css`:
```css
/* Stat cards */
.stat-card {
  background: white;
  border: 1px solid var(--gray-light);
  border-radius: 0.5rem;
  padding: 1.5rem;
  text-align: center;
}
.stat-card .stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.stat-card .stat-label {
  font-size: 0.875rem;
  color: var(--gray);
  margin-top: 0.25rem;
}

/* Tooltip */
.tooltip {
  position: absolute;
  background: white;
  border: 1px solid var(--gray-light);
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  pointer-events: none;
  font-size: 0.875rem;
  z-index: 100;
  max-width: 20rem;
}

/* Disclaimer */
.disclaimer {
  font-size: 0.8125rem;
  color: var(--gray);
  font-style: italic;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--gray-light);
}

/* Dog/Cat color utilities */
.dog-color { color: var(--red); }
.cat-color { color: var(--blue); }

/* Grid */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Create Nav.astro**

Create `site/src/components/Nav.astro`:
```astro
<nav id="site-nav">
  <div class="nav-inner">
    <a href="#hero" class="nav-logo">Pets of TO</a>
    <button class="nav-toggle" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links">
      <li><a href="#neighbourhoods">Neighbourhoods</a></li>
      <li><a href="#breeds">Breeds</a></li>
      <li><a href="#names">Names</a></li>
      <li><a href="#typical">Typical Pet</a></li>
      <li><a href="#rarity">Rarity</a></li>
    </ul>
  </div>
</nav>

<style>
  #site-nav {
    position: sticky;
    top: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--gray-light);
    z-index: 50;
  }
  .nav-inner {
    max-width: 72rem;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-logo {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--navy);
  }
  .nav-logo:hover { text-decoration: none; }
  .nav-links {
    display: flex;
    list-style: none;
    gap: 1.5rem;
  }
  .nav-links a {
    color: var(--gray);
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.15s;
  }
  .nav-links a:hover,
  .nav-links a.active { color: var(--navy); text-decoration: none; }
  .nav-toggle { display: none; background: none; border: none; cursor: pointer; }
  .nav-toggle span {
    display: block;
    width: 1.25rem;
    height: 2px;
    background: var(--navy);
    margin: 4px 0;
  }

  @media (max-width: 768px) {
    .nav-toggle { display: block; }
    .nav-links {
      display: none;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--bg);
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-light);
    }
    .nav-links.open { display: flex; }
  }
</style>
```

- [ ] **Step 4: Create Footer.astro**

Create `site/src/components/Footer.astro`:
```astro
---
import metadata from '../data/metadata.json';
---

<footer id="footer">
  <div class="footer-inner">
    <div class="footer-sources">
      <h3>Data Sources</h3>
      <ul>
        <li><a href="https://open.toronto.ca/dataset/licensed-dogs-and-cats/" target="_blank" rel="noopener">Licensed Dogs and Cats — City of Toronto Open Data</a></li>
        <li><a href="https://open.toronto.ca/dataset/licensed-dog-and-cat-names/" target="_blank" rel="noopener">Licensed Dog and Cat Names — City of Toronto Open Data</a></li>
        <li>Population: Statistics Canada, 2021 Census by Forward Sortation Area</li>
      </ul>
    </div>
    <div class="footer-disclaimers">
      <h3>Disclaimers</h3>
      {metadata.disclaimers.map((d: string) => (
        <p class="disclaimer">{d}</p>
      ))}
    </div>
    <div class="footer-meta">
      <p>Data last processed: {new Date(metadata.generated_at).toLocaleDateString('en-CA')}</p>
      <p>Covering license years {metadata.year_range[0]}–{metadata.year_range[1]}</p>
    </div>
  </div>
</footer>

<style>
  #footer {
    background: var(--navy);
    color: white;
    padding: 3rem 1.5rem;
    margin-top: 2rem;
  }
  .footer-inner {
    max-width: 72rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  .footer-inner h3 {
    margin-bottom: 0.75rem;
    font-size: 1rem;
  }
  .footer-inner ul { list-style: none; }
  .footer-inner li { margin-bottom: 0.5rem; font-size: 0.875rem; }
  .footer-inner a { color: #93c5fd; }
  .footer-disclaimers .disclaimer {
    color: rgba(255,255,255,0.7);
    border-left-color: rgba(255,255,255,0.3);
    font-size: 0.8125rem;
    margin-bottom: 0.5rem;
  }
  .footer-meta {
    grid-column: 1 / -1;
    text-align: center;
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.5);
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 1.5rem;
  }

  @media (max-width: 768px) {
    .footer-inner { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 5: Create Base.astro layout**

Create `site/src/layouts/Base.astro`:
```astro
---
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import '../styles/global.css';
import '../styles/components.css';
---

<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Pets of Toronto</title>
  <meta name="description" content="Exploring Toronto's licensed dogs and cats — breeds, names, and neighbourhoods, visualized from City of Toronto open data." />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <Nav />
  <main>
    <slot />
  </main>
  <Footer />
</body>
</html>
```

- [ ] **Step 6: Create minimal index.astro**

Create `site/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
---

<Base>
  <section id="hero">
    <h1>The Pets of Toronto</h1>
    <p>Coming soon — all sections</p>
  </section>
</Base>
```

- [ ] **Step 7: Verify dev server runs**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog/site
npx astro dev
```

Open `http://localhost:4321` — should see the title, nav, and footer rendering. Kill the dev server after verifying.

- [ ] **Step 8: Commit**

```bash
git add site/src/styles/ site/src/layouts/ site/src/components/Nav.astro site/src/components/Footer.astro site/src/pages/index.astro
git commit -m "feat(site): add base layout, global styles, nav, and footer"
```

---

## Task 11: Site — Hero Section with Donut Chart

**Files:**
- Create: `site/src/components/Hero.astro`, `site/src/scripts/donut.js`

- [ ] **Step 1: Create Hero.astro**

Create `site/src/components/Hero.astro`:
```astro
---
import citywide from '../data/citywide.json';

const total = citywide.total_licenses.toLocaleString();
const dogCount = citywide.species_split.DOG.toLocaleString();
const catCount = citywide.species_split.CAT.toLocaleString();
---

<section id="hero">
  <div class="hero-content">
    <h1>The Pets of Toronto</h1>
    <p class="hero-subtitle">A data portrait of {total} licensed dogs and cats across the city's neighbourhoods.</p>
    <div class="hero-stats">
      <div class="stat-card">
        <div class="stat-value dog-color">{dogCount}</div>
        <div class="stat-label">Licensed Dogs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value cat-color">{catCount}</div>
        <div class="stat-label">Licensed Cats</div>
      </div>
    </div>
    <div id="species-donut" class="donut-container"></div>
  </div>
</section>

<script>
  import { renderDonut } from '../scripts/donut.js';
  import citywide from '../data/citywide.json';
  renderDonut('#species-donut', citywide.species_split);
</script>

<style>
  #hero {
    text-align: center;
    padding: 6rem 1.5rem 4rem;
  }
  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--gray);
    margin-top: 0.75rem;
    max-width: 36rem;
    margin-left: auto;
    margin-right: auto;
  }
  .hero-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-top: 2.5rem;
  }
  .hero-stats .stat-card { min-width: 10rem; }
  .donut-container {
    margin: 2.5rem auto 0;
    max-width: 16rem;
  }

  @media (max-width: 768px) {
    #hero { padding: 3rem 1rem 2rem; }
    .hero-stats { flex-direction: column; align-items: center; }
  }
</style>
```

- [ ] **Step 2: Create donut.js**

Create `site/src/scripts/donut.js`:
```javascript
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
```

- [ ] **Step 3: Wire Hero into index.astro**

Update `site/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
---

<Base>
  <Hero />
</Base>
```

- [ ] **Step 4: Verify in browser**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog/site
npx astro dev
```

Check hero section renders with stats and donut chart.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/Hero.astro site/src/scripts/donut.js site/src/pages/index.astro
git commit -m "feat(site): add hero section with species donut chart"
```

---

## Task 12: Site — Neighbourhoods Map

**Files:**
- Create: `site/src/components/Neighbourhoods.astro`, `site/src/scripts/map.js`

- [ ] **Step 1: Create Neighbourhoods.astro**

Create `site/src/components/Neighbourhoods.astro`:
```astro
<section id="neighbourhoods">
  <h2>The Neighbourhoods</h2>
  <p>Which areas of Toronto are dog country, and which lean feline? This map shows the dog-to-cat licensing ratio by Forward Sortation Area (postal code prefix).</p>
  <div id="fsa-map"></div>
  <div id="map-tooltip" class="tooltip" style="display:none;"></div>
  <p class="disclaimer">Dog/cat dominance reflects licensing behavior, not confirmed pet population. Cat licensing compliance is generally lower than dog licensing compliance — an area may appear dog-dominant simply because dog owners are more likely to license.</p>
</section>

<script>
  import { renderMap } from '../scripts/map.js';
  import fsaSummary from '../data/fsa-summary.json';
  import fsaGeo from '../data/fsa-geo.json';
  renderMap('#fsa-map', '#map-tooltip', fsaGeo, fsaSummary);
</script>

<style>
  #neighbourhoods { text-align: center; }
  #neighbourhoods p { max-width: 40rem; margin: 0 auto; color: var(--gray); }
  #fsa-map {
    margin: 2rem auto;
    max-width: 48rem;
    position: relative;
  }
  #fsa-map svg { width: 100%; height: auto; }
</style>
```

- [ ] **Step 2: Create map.js**

Create `site/src/scripts/map.js`:
```javascript
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
```

- [ ] **Step 3: Wire into index.astro**

Add `import Neighbourhoods from '../components/Neighbourhoods.astro';` and `<Neighbourhoods />` after `<Hero />`.

- [ ] **Step 4: Verify in browser**

Map should render FSA polygons colored by dog/cat ratio with hover tooltips. (Requires `fsa-geo.json` to exist — if missing, the map section will be empty until Task 7's geo data is resolved.)

- [ ] **Step 5: Commit**

```bash
git add site/src/components/Neighbourhoods.astro site/src/scripts/map.js site/src/pages/index.astro
git commit -m "feat(site): add neighbourhoods choropleth map with tooltips"
```

---

## Task 13: Site — Breed Trends Section

**Files:**
- Create: `site/src/components/BreedTrends.astro`, `site/src/scripts/breed-chart.js`

- [ ] **Step 1: Create BreedTrends.astro**

Create `site/src/components/BreedTrends.astro`:
```astro
<section id="breeds">
  <h2>Breed Trends</h2>
  <p>How has breed popularity shifted across Toronto? Search for a breed to see its license count over time.</p>
  <div class="breed-controls">
    <select id="breed-species-toggle">
      <option value="DOG">Dogs</option>
      <option value="CAT">Cats</option>
    </select>
    <input type="text" id="breed-search" placeholder="Search breeds..." />
  </div>
  <div id="breed-line-chart"></div>
  <h3>Rising & Declining</h3>
  <div class="grid-2">
    <div>
      <h4 class="dog-color">Rising</h4>
      <div id="rising-breeds"></div>
    </div>
    <div>
      <h4 class="cat-color">Declining</h4>
      <div id="declining-breeds"></div>
    </div>
  </div>
</section>

<script>
  import { renderBreedTrends } from '../scripts/breed-chart.js';
  import breedTrends from '../data/breed-trends.json';
  renderBreedTrends(breedTrends);
</script>

<style>
  #breeds p { max-width: 40rem; color: var(--gray); }
  .breed-controls {
    display: flex;
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .breed-controls select,
  .breed-controls input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--gray-light);
    border-radius: 0.375rem;
    font-family: var(--font);
    font-size: 0.875rem;
  }
  .breed-controls input { flex: 1; max-width: 20rem; }
  #breed-line-chart { margin: 1.5rem 0; }
  #breeds h3 { margin-top: 2rem; }
  #breeds h4 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
</style>
```

- [ ] **Step 2: Create breed-chart.js**

Create `site/src/scripts/breed-chart.js`:
```javascript
import * as d3 from 'd3';

export function renderBreedTrends(breedTrends) {
  const speciesToggle = document.getElementById('breed-species-toggle');
  const searchInput = document.getElementById('breed-search');
  const chartContainer = document.getElementById('breed-line-chart');
  const risingContainer = document.getElementById('rising-breeds');
  const decliningContainer = document.getElementById('declining-breeds');

  if (!chartContainer) return;

  let currentSpecies = 'DOG';
  let searchTerm = '';

  function render() {
    const data = breedTrends[currentSpecies] || {};
    renderLineChart(chartContainer, data, searchTerm);
    renderRisingDeclining(risingContainer, decliningContainer, data);
  }

  speciesToggle?.addEventListener('change', (e) => {
    currentSpecies = e.target.value;
    render();
  });

  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toUpperCase();
    render();
  });

  render();
}

function renderLineChart(container, data, searchTerm) {
  container.innerHTML = '';

  // Filter breeds by search, show top 10 by latest count if no search
  let breeds = Object.keys(data);
  if (searchTerm) {
    breeds = breeds.filter(b => b.includes(searchTerm));
  }

  // Sort by latest year count
  breeds.sort((a, b) => {
    const aLast = data[a][data[a].length - 1]?.count || 0;
    const bLast = data[b][data[b].length - 1]?.count || 0;
    return bLast - aLast;
  });

  const displayBreeds = breeds.slice(0, 10);
  if (!displayBreeds.length) {
    container.innerHTML = '<p style="color:var(--gray)">No matching breeds found.</p>';
    return;
  }

  const margin = { top: 20, right: 120, bottom: 30, left: 50 };
  const width = 700;
  const height = 300;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const allEntries = displayBreeds.flatMap(b => data[b]);
  const years = [...new Set(allEntries.map(e => e.year))].sort();

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(allEntries, e => e.count)])
    .nice()
    .range([innerH, 0]);
  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Axes
  svg.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format('d')))
    .attr('font-size', '0.75rem');
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .attr('font-size', '0.75rem');

  const line = d3.line().x(d => x(d.year)).y(d => y(d.count));

  displayBreeds.forEach((breed, i) => {
    const entries = data[breed];
    svg.append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', color(i))
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Label at end of line
    const last = entries[entries.length - 1];
    svg.append('text')
      .attr('x', x(last.year) + 4)
      .attr('y', y(last.count))
      .attr('font-size', '0.625rem')
      .attr('fill', color(i))
      .attr('dominant-baseline', 'middle')
      .text(breed);
  });
}

function renderRisingDeclining(risingEl, decliningEl, data) {
  if (!risingEl || !decliningEl) return;

  // Compute latest YoY change for each breed
  const changes = [];
  for (const [breed, entries] of Object.entries(data)) {
    const last = entries[entries.length - 1];
    if (last?.yoy_change != null) {
      changes.push({ breed, change: last.yoy_change, count: last.count });
    }
  }

  // Filter to breeds with meaningful counts (>10 latest year)
  const meaningful = changes.filter(c => c.count > 10);
  meaningful.sort((a, b) => b.change - a.change);

  const rising = meaningful.slice(0, 5);
  const declining = meaningful.slice(-5).reverse();

  risingEl.innerHTML = renderBarList(rising, 'var(--red)');
  decliningEl.innerHTML = renderBarList(declining, 'var(--blue)');
}

function renderBarList(items, color) {
  if (!items.length) return '<p style="color:var(--gray)">Not enough data</p>';
  const maxAbs = Math.max(...items.map(i => Math.abs(i.change)));
  return items.map(item => {
    const pct = (item.change * 100).toFixed(2);
    const barWidth = Math.abs(item.change) / maxAbs * 100;
    const sign = item.change >= 0 ? '+' : '';
    return `<div style="margin-bottom:0.5rem">
      <div style="display:flex;justify-content:space-between;font-size:0.8125rem">
        <span>${item.breed}</span><span>${sign}${pct}%</span>
      </div>
      <div style="height:6px;background:var(--gray-light);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${barWidth}%;background:${color};border-radius:3px"></div>
      </div>
    </div>`;
  }).join('');
}
```

- [ ] **Step 3: Wire into index.astro**

Add `import BreedTrends from '../components/BreedTrends.astro';` and `<BreedTrends />` after `<Neighbourhoods />`.

- [ ] **Step 4: Verify in browser**

Line charts should render for top 10 breeds. Search should filter. Rising/declining bars should show.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/BreedTrends.astro site/src/scripts/breed-chart.js site/src/pages/index.astro
git commit -m "feat(site): add breed trends section with line charts and rising/declining bars"
```

---

## Task 14: Site — Names Section

**Files:**
- Create: `site/src/components/Names.astro`, `site/src/scripts/name-chart.js`

- [ ] **Step 1: Create Names.astro**

Create `site/src/components/Names.astro`:
```astro
<section id="names">
  <h2>Pet Names</h2>
  <p>The most popular names for Toronto's licensed pets. Search for a name to see how its ranking has changed over the years.</p>
  <div class="names-controls">
    <select id="names-species-toggle">
      <option value="DOG">Dogs</option>
      <option value="CAT">Cats</option>
    </select>
    <input type="text" id="name-search" placeholder="Search for a name..." />
  </div>
  <div class="grid-2">
    <div id="names-leaderboard"></div>
    <div id="name-bump-chart"></div>
  </div>
</section>

<script>
  import { renderNames } from '../scripts/name-chart.js';
  import names from '../data/names.json';
  renderNames(names);
</script>

<style>
  #names p { max-width: 40rem; color: var(--gray); }
  .names-controls {
    display: flex;
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .names-controls select,
  .names-controls input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--gray-light);
    border-radius: 0.375rem;
    font-family: var(--font);
    font-size: 0.875rem;
  }
  .names-controls input { flex: 1; max-width: 20rem; }
  #names-leaderboard { font-size: 0.875rem; }
</style>
```

- [ ] **Step 2: Create name-chart.js**

Create `site/src/scripts/name-chart.js`:
```javascript
import * as d3 from 'd3';

export function renderNames(namesData) {
  const speciesToggle = document.getElementById('names-species-toggle');
  const searchInput = document.getElementById('name-search');
  const leaderboard = document.getElementById('names-leaderboard');
  const bumpChart = document.getElementById('name-bump-chart');

  if (!leaderboard) return;

  let currentSpecies = 'DOG';
  let selectedName = null;

  function render() {
    const data = namesData[currentSpecies] || {};
    renderLeaderboard(leaderboard, data, (name) => {
      selectedName = name;
      renderBumpChart(bumpChart, data, name);
    });
    if (selectedName && data[selectedName]) {
      renderBumpChart(bumpChart, data, selectedName);
    } else {
      bumpChart.innerHTML = '<p style="color:var(--gray);font-size:0.875rem">Click a name to see its rank over time.</p>';
    }
  }

  speciesToggle?.addEventListener('change', (e) => {
    currentSpecies = e.target.value;
    selectedName = null;
    render();
  });

  searchInput?.addEventListener('input', (e) => {
    const term = e.target.value.toUpperCase();
    if (!term) return;
    const speciesData = namesData[currentSpecies] || {};
    // Partial match — find first name containing the search term
    const match = Object.keys(speciesData).find(n => n.includes(term));
    if (match) {
      selectedName = match;
      renderBumpChart(bumpChart, speciesData, match);
    }
  });

  render();
}

function renderLeaderboard(container, data, onNameClick) {
  // Find latest year
  let latestYear = 0;
  for (const entries of Object.values(data)) {
    for (const e of entries) {
      if (e.year > latestYear) latestYear = e.year;
    }
  }

  // Get top 20 by rank in latest year
  const top20 = [];
  for (const [name, entries] of Object.entries(data)) {
    const latest = entries.find(e => e.year === latestYear);
    if (latest) {
      top20.push({ name, rank: latest.rank, count: latest.count, entries });
    }
  }
  top20.sort((a, b) => a.rank - b.rank);
  const display = top20.slice(0, 20);

  // Build sparklines inline
  const allYears = [...new Set(display.flatMap(d => d.entries.map(e => e.year)))].sort();
  const maxRank = Math.max(...display.flatMap(d => d.entries.map(e => e.rank)));

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:2px solid var(--gray-light)">
          <th style="text-align:left;padding:0.5rem 0;width:2rem">#</th>
          <th style="text-align:left;padding:0.5rem 0">Name</th>
          <th style="text-align:right;padding:0.5rem 0;width:4rem">Count</th>
          <th style="width:6rem;padding:0.5rem 0">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${display.map(d => `
          <tr style="border-bottom:1px solid var(--gray-light);cursor:pointer" data-name="${d.name}">
            <td style="padding:0.375rem 0;color:var(--gray)">${d.rank}</td>
            <td style="padding:0.375rem 0;font-weight:500">${d.name}</td>
            <td style="padding:0.375rem 0;text-align:right;font-variant-numeric:tabular-nums">${d.count.toLocaleString()}</td>
            <td style="padding:0.375rem 0"><svg class="sparkline" data-name="${d.name}" viewBox="0 0 80 20" style="width:5rem;height:1.25rem"></svg></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Add click handlers
  container.querySelectorAll('tr[data-name]').forEach(tr => {
    tr.addEventListener('click', () => onNameClick(tr.dataset.name));
  });

  // Draw sparklines
  const x = d3.scaleLinear().domain(d3.extent(allYears)).range([2, 78]);
  const y = d3.scaleLinear().domain([maxRank, 1]).range([18, 2]);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.rank));

  container.querySelectorAll('.sparkline').forEach(svgEl => {
    const name = svgEl.dataset.name;
    const entries = data[name];
    if (!entries) return;
    d3.select(svgEl)
      .append('path')
      .datum(entries)
      .attr('fill', 'none')
      .attr('stroke', '#6B7280')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  });
}

function renderBumpChart(container, data, selectedName) {
  if (!container) return;
  container.innerHTML = '';

  const entries = data[selectedName];
  if (!entries?.length) {
    container.innerHTML = '<p style="color:var(--gray);font-size:0.875rem">Name not found.</p>';
    return;
  }

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 350;
  const height = 250;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain(d3.extent(entries, e => e.year)).range([0, innerW]);
  const y = d3.scaleLinear().domain([d3.max(entries, e => e.rank), 1]).range([innerH, 0]);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Title
  svg.append('text')
    .attr('x', innerW / 2)
    .attr('y', -6)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.875rem')
    .attr('font-weight', '600')
    .attr('fill', '#1A2B4A')
    .text(selectedName);

  // Axes
  svg.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(entries.length).tickFormat(d3.format('d')))
    .attr('font-size', '0.75rem');
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .attr('font-size', '0.75rem');

  // Y axis label
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2).attr('y', -28)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.6875rem')
    .attr('fill', '#6B7280')
    .text('Rank');

  // Line + dots
  const line = d3.line().x(d => x(d.year)).y(d => y(d.rank));
  svg.append('path')
    .datum(entries)
    .attr('fill', 'none')
    .attr('stroke', '#1A2B4A')
    .attr('stroke-width', 2)
    .attr('d', line);

  svg.selectAll('circle')
    .data(entries)
    .join('circle')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d.rank))
    .attr('r', 4)
    .attr('fill', '#1A2B4A');
}
```

- [ ] **Step 3: Wire into index.astro**

Add `import Names from '../components/Names.astro';` and `<Names />` after `<BreedTrends />`.

- [ ] **Step 4: Verify in browser**

Leaderboard should render with sparklines. Clicking a name should show the bump chart. Search should work.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/Names.astro site/src/scripts/name-chart.js site/src/pages/index.astro
git commit -m "feat(site): add names leaderboard with sparklines and bump chart"
```

---

## Task 15: Site — Most Typical Pet + How Rare Is Your Pet

**Files:**
- Create: `site/src/components/TypicalPet.astro`, `site/src/components/RarityLookup.astro`, `site/src/scripts/rarity.js`

- [ ] **Step 1: Create TypicalPet.astro**

Create `site/src/components/TypicalPet.astro`:
```astro
---
import citywide from '../data/citywide.json';

const dogBreed = citywide.top_breed?.DOG;
const catBreed = citywide.top_breed?.CAT;
const dogName = citywide.top_name?.DOG;
const catName = citywide.top_name?.CAT;
---

<section id="typical">
  <h2>The Most Typical Pet in Toronto</h2>
  <p>These are independent stats from separate datasets — not one combined animal profile.</p>
  <div class="grid-3">
    <div class="stat-card">
      <div class="stat-label">Most Licensed Species</div>
      <div class="stat-value">{citywide.species_split.DOG > citywide.species_split.CAT ? 'Dog' : 'Cat'}</div>
      <div class="stat-label">{Math.max(citywide.species_split.DOG, citywide.species_split.CAT).toLocaleString()} licenses</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Most Common Breed</div>
      {dogBreed && <div><span class="stat-value dog-color" style="font-size:1.5rem">{dogBreed.breed}</span><div class="stat-label">{dogBreed.count.toLocaleString()} dogs</div></div>}
      {catBreed && <div style="margin-top:0.75rem"><span class="stat-value cat-color" style="font-size:1.5rem">{catBreed.breed}</span><div class="stat-label">{catBreed.count.toLocaleString()} cats</div></div>}
    </div>
    <div class="stat-card">
      <div class="stat-label">Most Popular Name</div>
      {dogName && <div><span class="stat-value dog-color" style="font-size:1.5rem">{dogName.name}</span><div class="stat-label">{dogName.count.toLocaleString()} dogs ({dogName.year})</div></div>}
      {catName && <div style="margin-top:0.75rem"><span class="stat-value cat-color" style="font-size:1.5rem">{catName.name}</span><div class="stat-label">{catName.count.toLocaleString()} cats ({catName.year})</div></div>}
    </div>
  </div>
</section>

<style>
  #typical { text-align: center; }
  #typical > p { color: var(--gray); max-width: 36rem; margin: 0 auto 2rem; font-style: italic; }
</style>
```

- [ ] **Step 2: Create RarityLookup.astro**

Create `site/src/components/RarityLookup.astro`:
```astro
<section id="rarity">
  <h2>How Rare Is Your Pet?</h2>
  <p>Look up your pet's breed and neighbourhood to see how unique they are among Toronto's licensed animals.</p>
  <div class="rarity-form">
    <select id="rarity-species">
      <option value="">Species...</option>
      <option value="DOG">Dog</option>
      <option value="CAT">Cat</option>
    </select>
    <select id="rarity-breed" disabled>
      <option value="">Breed...</option>
    </select>
    <select id="rarity-fsa" disabled>
      <option value="">Neighbourhood (FSA)...</option>
    </select>
  </div>
  <div id="rarity-result"></div>
</section>

<script>
  import { initRarityLookup } from '../scripts/rarity.js';
  import breedList from '../data/breed-list.json';
  import fsaSummary from '../data/fsa-summary.json';
  initRarityLookup(breedList, fsaSummary);
</script>

<style>
  #rarity { text-align: center; }
  #rarity > p { color: var(--gray); max-width: 36rem; margin: 0 auto; }
  .rarity-form {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
    flex-wrap: wrap;
  }
  .rarity-form select {
    padding: 0.625rem 1rem;
    border: 1px solid var(--gray-light);
    border-radius: 0.375rem;
    font-family: var(--font);
    font-size: 0.9375rem;
    min-width: 12rem;
    background: white;
  }
  .rarity-form select:disabled { opacity: 0.5; }
  #rarity-result {
    max-width: 32rem;
    margin: 0 auto;
    font-size: 1.125rem;
    min-height: 4rem;
  }
</style>
```

- [ ] **Step 3: Create rarity.js**

Create `site/src/scripts/rarity.js`:
```javascript
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
```

- [ ] **Step 4: Wire into index.astro**

Add both components after `<Names />`:
```astro
import TypicalPet from '../components/TypicalPet.astro';
import RarityLookup from '../components/RarityLookup.astro';
```
```html
<TypicalPet />
<RarityLookup />
```

- [ ] **Step 5: Verify in browser**

Typical Pet should show stat cards. Rarity Lookup should cascade species → breed → FSA dropdowns and show a result.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/TypicalPet.astro site/src/components/RarityLookup.astro site/src/scripts/rarity.js site/src/pages/index.astro
git commit -m "feat(site): add Most Typical Pet stats and How Rare Is Your Pet lookup"
```

---

## Task 16: Site — Scroll Spy + Mobile Nav

**Files:**
- Create: `site/src/scripts/nav.js`

- [ ] **Step 1: Create nav.js**

Create `site/src/scripts/nav.js`:
```javascript
export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  // Mobile toggle
  toggle?.addEventListener('click', () => {
    links?.classList.toggle('open');
  });

  // Close on link click (mobile)
  links?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });

  // Scroll spy
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );

  sections.forEach(section => observer.observe(section));
}
```

- [ ] **Step 2: Wire into Base.astro**

Add to `site/src/layouts/Base.astro`, before `</body>`:
```html
<script>
  import { initNav } from '../scripts/nav.js';
  initNav();
</script>
```

- [ ] **Step 3: Verify in browser**

Scroll through sections — active nav link should highlight. Mobile hamburger should toggle menu.

- [ ] **Step 4: Commit**

```bash
git add site/src/scripts/nav.js site/src/layouts/Base.astro
git commit -m "feat(site): add scroll spy and mobile nav toggle"
```

---

## Task 17: Final Integration + Build Verification

**Files:**
- Modify: various fixes as needed

- [ ] **Step 1: Run full Astro build**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog/site
npm run build
```

Fix any build errors (missing imports, JSON parse issues, etc.).

- [ ] **Step 2: Preview the built site**

```bash
npm run preview
```

Open in browser. Walk through every section:
- Hero: title, stats, donut chart
- Neighbourhoods: map renders, hover tooltips work
- Breed Trends: line charts, search, rising/declining
- Names: leaderboard, sparklines, bump chart on click
- Most Typical Pet: stat cards
- How Rare Is Your Pet: cascading dropdowns, result display
- Footer: disclaimers, data sources, timestamp
- Nav: scroll spy, mobile toggle

- [ ] **Step 3: Fix any issues found**

Iterate until the site renders correctly in all sections.

- [ ] **Step 4: Run all pipeline tests one final time**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog
python -m pytest pipeline/tests/ -v
```

- [ ] **Step 5: Commit final fixes**

```bash
git add -A
git commit -m "fix: resolve build and integration issues"
```

---

## Task 18: Deploy to Vercel

- [ ] **Step 1: Initialize Vercel project**

```bash
cd C:/Users/Alex/Downloads/PROJECTS/MISCELLANEOUS/catdog
npx vercel
```

Follow the prompts. When asked for settings:
- Build command: `cd site && npm run build`
- Output directory: `site/dist`
- Install command: `cd site && npm install`

- [ ] **Step 2: Verify deployment**

Open the Vercel URL. Confirm the site loads and all sections work.

- [ ] **Step 3: Commit any Vercel config changes**

```bash
git add -A
git commit -m "chore: add Vercel deployment config"
```
