# The Pets of Toronto — Project Spec

## Overview
A data site modeled on [thedogsofsf.com](https://thedogsofsf.com/), built from the City of Toronto's open data on licensed dogs and cats. Unlike the SF source (per-animal records with name, sex, color, age), Toronto's core dataset is coarser — this spec reflects what's realistically buildable from it, plus a supplementary names dataset.

## Data Sources

### 1. Licensed Dogs and Cats Reports (primary)
- Portal: City of Toronto Open Data, CKAN — `Licensed Dogs and Cats Reports`
- Fields: **year license issued, FSA (first 3 chars of postal code), species (dog/cat), primary breed**
- Coverage for this project: 2023–present (a separately-formatted, less-usable pre-2023 archive exists and is out of scope)
- **Unconfirmed / to verify first**: whether this is per-license row-level data or already pre-aggregated to `(year, FSA, species, breed, count)`. This determines what queries are possible. Check before building anything.
- **No individual-animal join** between this dataset and the names dataset below — name and breed are NOT linked per animal. Any "most typical pet" framing must respect this (see Features).

### 2. Licensed Dog and Cat Names (supplementary)
- Same portal, separate dataset: `Licensed Dog and Cat Names`
- Confirmed to extend past 2023.
- **Known quirk**: inconsistent cutoff per year — some years list top 200 names, others top ~156. Not a fixed top-N. Handle per-year counts as-is; don't assume comparable N across years for anything sensitive to list length (e.g., don't compute "% of names in top N" across years without normalizing).
- "No Name" entries are being kept as real data (not stripped as placeholders).
- This is pre-aggregated to name leaderboards, not individual records — can't cross with breed/FSA.

### 3. Census population by FSA (enrichment, to be sourced separately)
- Needed for per-capita licensing rate.
- Most recent full Census FSA population data is 2021 — there's a timing mismatch against 2023+ pet data. This needs a visible disclaimer, not silent treatment as current.

### 4. FSA → neighbourhood name crosswalk (enrichment, to be sourced/built)
- Toronto FSAs don't map 1:1 to named neighbourhoods. Needed for map readability ("M5V" → "King West/CityPlace"). Others have built this before via StatCan FSA shapefiles + neighbourhood name references — worth searching for an existing crosswalk before building one from scratch.

## Feature Scope (decided)

### The Neighbourhoods
- **Map, dog vs cat dominant per FSA** — framed like a political-lean map. Requires a disclaimer (see Disclaimers) that this reflects licensing/compliance behavior, not necessarily true pet population, since cat licensing compliance is typically much lower than dog compliance everywhere.
- **Common breed on hover**: total cats/dogs + breed makeup per FSA.
- **Rare breed leaderboard**: for each FSA, show the bottom 5 lowest-count breeds per species. Explicitly meaningless-trivia-tolerant — small-sample noise (lots of count=1 breeds) is fine and expected, no minimum threshold needed.
- **Signature breed**: breeds over-represented in an FSA vs. citywide rate (direct analog to SF's approach — same technique, portable as-is).
- **Per-capita licensing rate**: join Census population by FSA. Needs the 2021-vs-2023+ timing disclaimer.

### Names
- Leaderboard of top names for cats/dogs (as available per year, given inconsistent top-N cutoffs).
- Rank of top names by year (trend of a given name's rank over time).
- Data currently scattered across multiple CSV/XLS files per year — needs a consolidation/parsing step before anything else in this section can be built.

### Breed Trends
- License counts by breed over time, citywide.
- Rising vs. declining breeds (share-of-total change year over year) — direct analog to SF's "shift" section.

### Most Typical Pet in Toronto
- Reframed to respect the lack of individual-level join: report the **top-ranked name** and **top-ranked breed** independently (each is "most common" within its own dataset), not as a single combined animal profile. Do not imply "the most typical pet is a Corgi named Max" — that combined claim isn't supportable by this data. Fine to also give top FSA / most common species etc. as separate independent stats.

### How Rare Is Your Pet
- Lookup by breed × FSA × species → estimated count/rarity. This is the strongest direct analog to SF's calculator since breed × FSA × species is the actual grain of the primary dataset.

## Explicitly Omitted
- **Purebred or mutt / breed-cross web** (SF's Poodle-hub doodle diagram): omitted. Would require either a controlled breed taxonomy (to classify purebred vs. mixed) or a second breed field (to detect specific two-breed crosses), and there's no domain knowledge yet to build a purebred/mixed classifier from a free-text or single-value breed field. Can revisit later if the breed field turns out to be cleaner than expected.
- **Coat color, sex, age, license duration/altered status** — not present in the data at all.
- **Adoptable pet listings** — would require a live shelter-listings integration, separate from license data.

## Disclaimers Needed on Site
1. Dog/cat "dominance" map reflects **licensing behavior**, not confirmed pet population — cat compliance is generally lower than dog compliance regardless of true ownership. State this near the map, similar to SF's "useful sample, not a census" framing.
2. Per-capita rate uses 2021 Census population against 2023+ license data — note the year mismatch.
3. General note that all data is self-reported/voluntary-compliance licensing, not a full census of pets in the city (same spirit as SF's disclaimer).

## Open Technical Questions (resolve early)
1. Is the primary Licensed Dogs and Cats dataset row-level or pre-aggregated? Pull a sample and check.
2. What does the breed field actually look like — controlled list or free text? Pull distinct values.
3. Does "year license issued" represent first-issue year per animal, or does it reset/repeat on renewal? Affects any "new vs. renewal" framing (not currently in scope, but good to know).
4. Confirm current CKAN resource IDs/endpoints for both the FSA/breed dataset and the names dataset (API access, refresh cadence, exact column names).

## Suggested Build Order
1. Pull and profile both datasets (row-level vs. aggregated, breed field cleanliness, name file consolidation).
2. Build the FSA → neighbourhood crosswalk and pull Census FSA population.
3. Core breed trends (citywide) — cleanest, least dependent on other steps.
4. Neighbourhood map (dog/cat dominance, common/rare/signature breed, per-capita).
5. Names leaderboard + rank-by-year (after consolidating scattered files).
6. Most typical pet (independent stats) + rarity lookup tool.
