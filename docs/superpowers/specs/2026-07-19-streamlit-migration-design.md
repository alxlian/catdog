# Streamlit Migration Design — Pets of Toronto

**Date:** 2026-07-19
**Status:** Approved

## Overview

Migrate the Pets of Toronto frontend from Astro + D3 to a Streamlit multi-page app. The Python pipeline already exists; Streamlit lets us go data-to-UI in one language with richer interactivity and cleaner charting via Plotly.

The existing Astro site remains untouched. Work happens on a feature branch (`feat/streamlit-app`). Nothing merges to main without explicit alignment.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Charting | Mix — Plotly for map/charts, Streamlit native for stats/tables | Plays to each library's strengths |
| Map | Plotly choropleth with GeoJSON (source is already GeoJSON) | Native Plotly support, clean integration |
| Styling | Full custom CSS via `st.markdown(unsafe_allow_html=True)` | Match Figma's cream/gold/orange palette and pet-tag cards |
| Data sharing | Shared `data/` directory at project root | Decouples frontends, single source of truth |
| Adopt! page | Static info page (curated shelters/rescues) | Placeholder, evolve later |
| Scope | All 7 pages, scale back if needed | Full feature parity as starting target |

## Architecture

```
pipeline/run.py --> data/*.json (shared root directory)
                      |
            +---------+---------+
            |                   |
   streamlit_app/app.py    site/src/data/
   (reads JSON)            (existing Astro, unchanged)
```

## File Structure

```
catdog/
├── data/                          # shared pipeline output (NEW location)
│   ├── citywide.json
│   ├── fsa-summary.json
│   ├── fsa-geo.geojson            # renamed from fsa-geo.json (already GeoJSON)
│   ├── breed-trends.json
│   ├── names.json
│   ├── breed-list.json
│   └── metadata.json
├── streamlit_app/                 # NEW
│   ├── app.py                     # entry point, navigation, global CSS
│   ├── pages/
│   │   ├── 1_At_a_Glance.py
│   │   ├── 2_Neighbourhoods.py
│   │   ├── 3_Breeds.py
│   │   ├── 4_Names.py
│   │   ├── 5_By_the_Numbers.py
│   │   ├── 6_How_Rare_Is_Your_Pet.py
│   │   └── 7_Adopt.py
│   ├── style.css                  # custom CSS
│   └── utils.py                   # shared helpers
├── pipeline/                      # existing — output path updated
├── site/                          # existing Astro — unchanged
└── requirements.txt               # NEW — streamlit, plotly, pandas
```

## Pages

### 1. At a Glance (Home)

- **Data:** `citywide.json`, `breed-list.json` (for unique breeds count), `names.json` (for Luna total)
- **Layout:** Title "Cats & Dogs of Toronto", 4 pet-tag stat cards in a row, species donut chart below
- **Stat cards:** Total Dogs, Total Cats, Unique Breeds, Pets Named Luna (values computed at load time, not hardcoded)
- **Unique Breeds:** count distinct breeds across all entries in `breed-list.json`
- **Pets Named Luna:** sum `count` for all years/species where `name == "LUNA"` from `names.json`
- **Cards styled as gold circular pet tags** with CSS gradients, matching Figma
- **Donut chart:** Plotly donut showing dog/cat species split

### 2. Neighbourhoods

- **Data:** `fsa-summary.json`, `fsa-geo.geojson`
- **Layout:** Plotly choropleth map (left/main), stats sidebar (right)
- **Mode toggle:** Dog/Cat Ratio, Licensing Density, Most Common Breed, Signature Breed
- **Sidebar panel:** On FSA click/hover — neighbourhood name, dog/cat counts, top 3 breeds, rare breeds, signature breed, per-capita rate
- **Species toggle:** Dog/Cat filter

### 3. Breeds

- **Data:** `breed-trends.json`
- **Layout:** Species toggle, search input, Plotly line chart (% share over time, 2023-2026)
- **Below chart:** Rising breeds section (positive YoY change), Declining breeds section (negative YoY change)
- **Y-axis:** Percentage share (not absolute counts)

### 4. Names

- **Data:** `names.json`
- **Layout:** Species toggle, search input, leaderboard table
- **Table columns:** Rank, Name, Count, Sparkline (rank trend over years)
- **Sparklines:** Use `st.column_config.LineChartColumn` (built-in since Streamlit 1.28) for rank trend sparklines in dataframe columns

### 5. By the Numbers

- **Data:** `citywide.json`
- **Layout:** 3 pet-tag styled stat cards
  - Most common species (with count)
  - Most common breed per species (with count)
  - Most common name per species (with count and year)

### 6. How Rare Is Your Pet?

- **Data:** `breed-list.json`, `fsa-summary.json`
- **Layout:** Cascading selectboxes: Species -> Breed -> Neighbourhood (FSA)
- **Result:** Rarity percentile display — "Rarer than X% of breeds in your neighbourhood"
- **Styled result card** with percentile visualization

### 7. Adopt!

- **Static page** with curated list of Toronto-area shelters and rescues
- **Each entry:** Name, address, website link, brief description
- **Shelters:** Toronto Animal Services, Toronto Humane Society, and other local rescues
- **Simple card layout**, easy to update later

## Styling (Custom CSS)

### Palette (from Figma)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FFF8F0` (warm cream) | Page background |
| Card gold | linear gradient `#F5C542` → `#E8A817` | Pet-tag stat cards |
| Accent orange | `#E8731A` | Active nav, CTAs, hover states |
| Text dark | `#2D2D2D` | Body text |
| Text muted | `#6B7280` | Labels, captions |
| Sidebar bg | `#FAF5EF` | Left nav background |

### Pet-Tag Cards

- Circular/rounded gold gradient background
- Ring/clasp decorative element at top (CSS pseudo-element)
- Large bold number, uppercase label below
- Drop shadow for depth

### Sidebar Navigation

- "Pets of Toronto" logo/title at top
- Icon + label for each page link
- Active state: orange accent
- "Adopt!" link separated at bottom with distinct styling
- Footer: "Data last processed" timestamp

### Plotly Theme

- Match background colours to page (`#FFF8F0`)
- Use warm colour scale for choropleth (cream → gold → orange)
- Consistent font (system sans-serif or Inter if available)
- Transparent plot backgrounds

## Data Pipeline Changes

1. **Add `data/` output directory** at project root
2. **Update `pipeline/run.py`** to write JSON outputs to `data/` instead of `site/src/data/`
3. **Copy `fsa-geo.json` to `data/fsa-geo.geojson`** — the source file is already GeoJSON format, just rename the extension for clarity. No conversion needed; the `topojson` package is not required.
4. **Astro backwards compatibility:** Update Astro data imports to read from `../../data/` instead of `./data/`, or add a pipeline post-step that copies `data/*` to `site/src/data/`. Prefer updating Astro imports to avoid duplication.

## Dependencies

```
streamlit>=1.36,<2.0
plotly>=5.20
pandas>=2.0
```

Note: `streamlit>=1.36` required for `st.navigation()` API (custom sidebar control) and `st.plotly_chart(on_select="rerun")` (choropleth click events).

## Development Workflow

- All work on `feat/streamlit-app` branch
- Run with `streamlit run streamlit_app/app.py`
- No changes to main/prod without explicit user approval
- Astro site remains fully functional throughout

## Technical Details

### Entry Point (`app.py`)

`app.py` serves as the navigation shell using `st.navigation()`. It:
- Calls `st.set_page_config(page_title="Pets of Toronto", page_icon="🐾", layout="wide")`
- Injects global CSS from `style.css`
- Defines the `st.navigation()` page list and runs the selected page
- Does NOT render page content itself — "At a Glance" is `pages/1_At_a_Glance.py`

### Caching

All data loading functions use `@st.cache_data` to avoid re-reading JSON on every interaction:
- `load_citywide()`, `load_fsa_summary()`, `load_geojson()`, `load_breed_trends()`, etc.
- GeoJSON (~2MB) especially benefits from caching

### Choropleth Click Events

Use `st.plotly_chart(fig, on_select="rerun")` (Streamlit 1.36+) to capture FSA clicks on the map. The selected FSA code is read from the selection event data and used to populate the sidebar stats panel.

### GeoJSON Join Key

The GeoJSON uses `properties.CFSAUID` as the FSA identifier (e.g., "M9P"). Plotly choropleth must set `featureidkey="properties.CFSAUID"` to join with `fsa-summary.json` keys.

### Sidebar Navigation

Use `st.navigation()` API for full control over sidebar page list, ordering, and grouping. This replaces Streamlit's auto-generated sidebar from the `pages/` directory. The "Adopt!" page is separated into its own section at the bottom.

## Out of Scope

- Deployment configuration (Streamlit Cloud, Docker, etc.)
- Authentication or user accounts
- Real-time data updates (pipeline runs manually)
- Mobile-optimized responsive layout (desktop-first, Streamlit handles basic responsiveness)
