# The Pets of Toronto — Design Spec

## Overview

A data site built from the City of Toronto's open data on licensed dogs and cats, modeled on thedogsofsf.com. Static site with pre-computed data, deployed to Vercel.

## Data Profile

### Primary Dataset: Licensed Dogs and Cats (CKAN API)
- **Source:** City of Toronto Open Data CKAN — package `licensed-dogs-and-cats`, resource `4a773296-7225-442d-9929-074549b2ccc0`
- **Grain:** Row-level. Each record is one license: `(Year, FSA, ANIMAL_TYPE, PRIMARY_BREED)`
- **Volume:** 230,398 records
- **Year range:** 2023–2026
- **FSAs:** ~98 Toronto M-prefix postal prefixes
- **Breed field:** Abbreviated free-text (e.g., `GOLDEN RETR`, `DOMESTIC SH`, `POODLE MIN`). Not a controlled list — will need normalization for display but can aggregate as-is.

### Names Dataset (local CSV)
- **File:** `Licensed Dog and Cat Names Since 2020.csv`
- **Grain:** Pre-aggregated leaderboard: `(ANIMAL_TYPE, Year, Rank, ANIMAL_NAME, AnimalCnt)`
- **Volume:** 2,800 rows, years 2020–2026, CAT and DOG
- **Known quirk:** Inconsistent top-N cutoff per year (some years ~200, others ~156). Handle per-year counts as-is.
- **"No Name" entries:** Kept as real data (not stripped as placeholders). Displayed on leaderboards as-is with no special annotation — it's a genuine entry.
- **Consolidation status:** Already consolidated into a single CSV file (confirmed). No multi-file parsing step needed.
- **Year range note:** Names data covers 2020–2026 (wider than the 2023–2026 primary dataset). Name trend charts will show the full 2020–2026 range since this data stands on its own.
- **Not joinable** to the primary dataset — name and breed are independent.

### Census FSA Population (to source)
- **Source:** StatCan 2021 Census, population by Forward Sortation Area
- **Purpose:** Per-capita licensing rate calculation
- **Caveat:** 2021 population vs. 2023+ license data — year mismatch requires visible disclaimer.

### FSA-to-Neighbourhood Crosswalk (to source/build)
- **Purpose:** Map readability — translate FSA codes to human-readable neighbourhood names (e.g., M5V -> King West/CityPlace)
- **Approach:** Source an existing crosswalk or build from StatCan FSA shapefiles + neighbourhood references.

### Local XLS Files (superseded)
- `by-forward-sortation-area-fsa-2021.xls` and `by-primary-breed-2021.xls` are 2021 summary snapshots.
- Superseded by the API dataset for all purposes. Retained for reference only.

## Architecture

Two-stage build with clean separation:

```
pipeline/          Python data pipeline
  run.py           Entry point — orchestrates all steps
  pull.py          CKAN API data fetcher + local cache
  aggregate.py     Aggregation logic (FSA summaries, breed trends, etc.)
  geo.py           FSA TopoJSON generation

src/               Astro site source
  data/            Pre-computed JSON (output of pipeline, committed to repo)
  pages/
  components/
  layouts/
  styles/

public/            Static assets
```

**Workflow:**
1. `python pipeline/run.py` — pulls data, aggregates, writes JSON to `src/data/`
2. `astro build` — consumes JSON, outputs static HTML/JS/CSS
3. Deploy to Vercel (auto-deploys from git push)

Pipeline runs independently when data needs refreshing (weekly/monthly). Updated JSON files are committed to the repo. No database, no server, no API keys at runtime.

## Data Pipeline

### Processing Steps

1. **Pull primary dataset** — full dump of 230K records from CKAN API, cached as `pipeline/cache/licensed-dogs-cats.csv` to avoid re-pulling on subsequent runs.
2. **Load names data** — read the existing CSV file.
3. **Load Census FSA population** — from a manually-sourced reference file `pipeline/reference/census-fsa-population.csv`.
4. **Load FSA-to-neighbourhood crosswalk** — from `pipeline/reference/fsa-neighbourhoods.csv`.
5. **Aggregate and write JSON outputs.**

### Output Files

| File | Contents | Site Consumer |
|---|---|---|
| `fsa-summary.json` | Per FSA: neighbourhood name, cat count, dog count, dog/cat ratio, top 3 breeds per species, bottom 5 rare breeds per species, signature breed per species, per-capita licensing rate | Map section, neighbourhood tooltips |
| `fsa-geo.json` | TopoJSON of Toronto FSA boundary polygons | D3 map rendering |
| `breed-trends.json` | Per breed per year per species: count, share of total, YoY share change | Breed trends section |
| `names.json` | Per name per year per species: rank, count | Names leaderboard, name trend charts |
| `citywide.json` | Independent top-level stats: most common species, most common breed (per species), most common name (per species), total licenses, species split ratio | "Most Typical Pet" section |
| `breed-list.json` | All (breed, FSA, species) combinations with counts, plus citywide rarity percentile | "How Rare Is Your Pet" lookup |
| `metadata.json` | Pipeline run timestamp, year range in data, disclaimer texts | Footer, disclaimers |

### Signature Breed Calculation

For each FSA and species:
1. Compute `breed_share_in_fsa = count_of_breed_in_fsa / total_of_species_in_fsa`
2. Compute `breed_share_citywide = count_of_breed_citywide / total_of_species_citywide`
3. `signature_ratio = breed_share_in_fsa / breed_share_citywide`
4. Highest ratio = signature breed (most over-represented vs. city average)
5. Exclude breeds with fewer than 3 licenses in the FSA to avoid noise from count=1 outliers.

### Rare Breed Leaderboard

For each FSA and species, show the bottom 5 breeds by license count. **No minimum threshold** — count=1 breeds are expected and fine. This is intentionally trivia-tolerant per the project spec.

### Rarity Percentile Calculation

For the "How Rare Is Your Pet" lookup:
1. For a given (species, breed, FSA), count = number of licenses.
2. Percentile = percentage of (species, breed) combinations in that FSA with count **strictly greater than** this breed's count (so rare breeds score high — most other breeds have more licenses).
3. "Rarer than X% of breeds in your neighbourhood."

## Site Structure

Single-page scrolling site with anchor-linked sections and a sticky top nav.

### Sections (in scroll order)

#### 1. Hero
- Title: "The Pets of Toronto"
- Subtitle: one-liner about Toronto's licensed pets
- Total pet count as a large stat
- Species split donut chart (D3)

#### 2. The Neighbourhoods
- **D3 choropleth map** of FSA polygons
  - Color fill: continuous blue-to-red gradient by dog/cat ratio (blue = cat-dominant, red = dog-dominant)
  - No base map tiles — FSA shapes on off-white background
  - Polygon outlines in navy
- **Hover/click interaction** — tooltip or sidebar panel showing:
  - Neighbourhood name (from crosswalk)
  - Total cats and dogs
  - Top 3 breeds per species
  - Bottom 5 rare breeds per species
  - Signature breed per species
  - Per-capita licensing rate (with Census year caveat)
- **Disclaimer** beneath the map: licensing reflects compliance behavior, not true pet population; cat compliance is generally lower than dog compliance.

#### 3. Breed Trends
- **Line charts:** breed license counts over time (2023–2026), searchable/filterable by breed name
- **Rising & Declining highlight:** top 5 breeds gaining share + top 5 losing share, displayed as horizontal bar chart of YoY share change
- Separate views for dogs and cats (toggle or side-by-side)

#### 4. Names
- **Top 20 leaderboard** for dogs and cats (latest year), each row has a sparkline showing rank trend over available years
- **Name search:** select a name, see its rank trajectory as a bump chart across years
- Dogs and cats as separate tabs or side-by-side columns

#### 5. Most Typical Pet
- Three bold stat cards displayed independently:
  - Most common species (with count)
  - Most common breed per species (with count)
  - Most common name per species (with count)
- Explicit framing: "These are independent stats from separate datasets — not one combined animal profile."

#### 6. How Rare Is Your Pet
- Interactive lookup form: species dropdown -> breed dropdown (filtered by species) -> FSA dropdown
- Result: license count for that combination, rarity percentile, contextual sentence
- Example output: "There are 3 licensed Samoyeds in M4V (King West). That's rarer than 89% of breeds in your neighbourhood."

#### 7. Footer
- Data sources with links to Toronto Open Data portal
- All three disclaimers:
  1. Licensing ≠ true population (cat compliance lower)
  2. Census 2021 population vs. 2023+ license data year mismatch
  3. All data is self-reported voluntary-compliance licensing
- Last-updated timestamp from pipeline metadata

## Visual Design

### Typography
- **Headlines:** Bold sans-serif (Inter), large sizes, high contrast against off-white
- **Body:** Inter regular, comfortable reading size (16–18px base)
- **Data/stats:** Tabular-lining figures for alignment in charts and leaderboards

### Color Palette — Toronto Civic Editorial
| Role | Color | Hex |
|---|---|---|
| Primary (text, headers, map outlines) | Deep navy | #1A2B4A |
| Dog accent | Toronto flag red | #C41E3A |
| Cat accent | Steel blue | #3B7EA1 |
| Background | Off-white | #FAFAF8 |
| Secondary text | Mid gray | #6B7280 |
| Borders/dividers | Light gray | #E5E7EB |
| Map gradient | Blue ↔ neutral ↔ red | Continuous scale from cat-dominant to dog-dominant |

### Map Style
- FSA polygons filled by dog/cat ratio on continuous color scale
- Outlined in navy (#1A2B4A)
- Hover: polygon brightens, slight scale, tooltip appears
- No base map tiles — shapes on off-white background

### Charts (all D3)
- Line charts: thin lines with dot markers on hover
- Bar charts: horizontal for rising/declining breeds
- Donut chart: species split in hero
- Consistent color coding throughout: red = dog, blue = cat
- Tooltips on hover for all data points

### Interaction & Responsiveness
- Smooth scroll between sections via sticky top nav with section links
- Sticky nav: minimal, shows section names, highlights current section
- Mobile: map scales down (pinch-to-zoom), charts reflow to single column, nav collapses to hamburger
- All interactive elements keyboard-accessible

## Tech Stack Summary

| Layer | Choice | Rationale |
|---|---|---|
| Data pipeline | Python 3.12 (stdlib + requests) | Clean separation, good for aggregation work |
| Site framework | Astro | Ships minimal JS, fast static sites, perfect for data content |
| Interactive components | D3.js (v7) | Maps, charts, all in one library, no tile API dependency |
| Styling | Vanilla CSS (or Astro scoped styles) | Simple, no build dependency |
| Hosting | Vercel | Free tier, zero-config Astro deploys |
| Fonts | Inter (via Google Fonts or self-hosted) | Clean, widely available, good tabular figures |

## Disclaimers (required on site)

1. Dog/cat "dominance" map reflects **licensing behavior**, not confirmed pet population — cat licensing compliance is generally lower than dog compliance regardless of true ownership.
2. Per-capita rate uses **2021 Census population** against **2023+ license data** — there is a year mismatch.
3. All data is **self-reported voluntary-compliance licensing**, not a full census of pets in the city.

## Resolved Open Questions

From the project spec's "Open Technical Questions":

1. **Row-level or pre-aggregated?** — Row-level. 230K individual license records confirmed via API sampling.
2. **Breed field format?** — Abbreviated free-text, not a controlled list (e.g., `GOLDEN RETR`, `DOMESTIC SH`, `SHETLD SHEEPDOG`). Aggregable as-is; may want display-name normalization for the UI.
3. **Year = first-issue or renewal?** — Not determinable from the data alone and not affecting current features. Out of scope.
4. **CKAN resource IDs?** — Confirmed. Datastore-active resource: `4a773296-7225-442d-9929-074549b2ccc0`. Three additional non-datastore resources (CSV, XML, JSON downloads) also available.

## Explicitly Omitted

- Purebred/mutt classification or breed-cross diagrams
- Coat color, sex, age, license duration, altered status (not in data)
- Adoptable pet listings (would require live shelter integration)
- Pre-2023 license data (different format, out of scope)
- Live data refresh at runtime (static site, pipeline runs offline)
