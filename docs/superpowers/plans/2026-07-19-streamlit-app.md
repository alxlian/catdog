# Streamlit Pets of Toronto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Streamlit multi-page app matching the Figma design for Pets of Toronto, reading from existing pipeline JSON data.

**Architecture:** Python Streamlit app with `st.navigation()` for sidebar control, Plotly for charts/maps, custom CSS for the Figma cream/gold/orange palette and pet-tag cards. Data loaded from shared `data/` directory at project root via cached helper functions.

**Tech Stack:** Streamlit 1.36+, Plotly 5.20+, Pandas 2.0+, Python 3.10+

**Spec:** `docs/superpowers/specs/2026-07-19-streamlit-migration-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `streamlit_app/app.py` | Entry point: `st.set_page_config`, CSS injection, `st.navigation()` shell |
| `streamlit_app/utils.py` | Cached data loaders (`@st.cache_data`), `to_title_case()`, CSS injection helper |
| `streamlit_app/style.css` | All custom CSS: palette, pet-tag cards, sidebar overrides, Plotly container styling |
| `streamlit_app/pages/1_At_a_Glance.py` | 4 pet-tag stat cards + Plotly donut chart |
| `streamlit_app/pages/2_Neighbourhoods.py` | Plotly choropleth map + mode toggle + FSA detail sidebar |
| `streamlit_app/pages/3_Breeds.py` | Breed trend line chart + rising/declining sections |
| `streamlit_app/pages/4_Names.py` | Name leaderboard table with sparklines |
| `streamlit_app/pages/5_By_the_Numbers.py` | 3 stat cards (top species, breed, name) |
| `streamlit_app/pages/6_How_Rare_Is_Your_Pet.py` | Cascading selects + rarity percentile display |
| `streamlit_app/pages/7_Adopt.py` | Static shelter/rescue info cards |
| `requirements.txt` | Python dependencies |
| `pipeline/run.py` | Modified: dual output to `data/` and `site/src/data/` |

---

## Task 0: Branch and Project Setup

**Files:**
- Create: `requirements.txt`
- Modify: `pipeline/run.py`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/streamlit-app
```

- [ ] **Step 2: Create requirements.txt**

Create `requirements.txt` at project root:

```
streamlit>=1.36,<2.0
plotly>=5.20
pandas>=2.0
```

- [ ] **Step 3: Update pipeline output path**

In `pipeline/run.py`, change `OUTPUT_DIR` to point to `data/` at project root, and add a copy step to keep `site/src/data/` in sync:

```python
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data")
SITE_DATA_DIR = os.path.join(PROJECT_ROOT, "site", "src", "data")
```

At the end of `main()`, after all writes, add:

```python
print("Syncing to site/src/data/...")
import shutil
os.makedirs(SITE_DATA_DIR, exist_ok=True)
for fname in os.listdir(OUTPUT_DIR):
    shutil.copy2(os.path.join(OUTPUT_DIR, fname), os.path.join(SITE_DATA_DIR, fname))
```

- [ ] **Step 4: Create the shared data directory and copy existing data**

```bash
mkdir -p data
cp site/src/data/*.json data/
cp data/fsa-geo.json data/fsa-geo.geojson
```

- [ ] **Step 5: Create streamlit_app directory structure**

```bash
mkdir -p streamlit_app/pages
```

- [ ] **Step 6: Install dependencies**

```bash
pip install -r requirements.txt
```

- [ ] **Step 7: Commit**

```bash
git add requirements.txt pipeline/run.py data/
git commit -m "feat: add shared data dir, requirements, and branch setup"
```

---

## Task 1: Utils and CSS Foundation

**Files:**
- Create: `streamlit_app/utils.py`
- Create: `streamlit_app/style.css`

- [ ] **Step 1: Create utils.py with cached data loaders**

Create `streamlit_app/utils.py`:

```python
"""Shared helpers: cached data loaders, title case, CSS injection."""

import json
import os
import streamlit as st

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


def inject_css():
    """Read style.css and inject into the page."""
    css_path = os.path.join(os.path.dirname(__file__), "style.css")
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)


def to_title_case(s: str) -> str:
    """Convert 'LABRADOR RETR' to 'Labrador Retr'."""
    return s.title() if s else s


@st.cache_data
def load_citywide() -> dict:
    with open(os.path.join(DATA_DIR, "citywide.json")) as f:
        return json.load(f)


@st.cache_data
def load_fsa_summary() -> dict:
    with open(os.path.join(DATA_DIR, "fsa-summary.json")) as f:
        return json.load(f)


@st.cache_data
def load_geojson() -> dict:
    with open(os.path.join(DATA_DIR, "fsa-geo.geojson")) as f:
        return json.load(f)


@st.cache_data
def load_breed_trends() -> dict:
    with open(os.path.join(DATA_DIR, "breed-trends.json")) as f:
        return json.load(f)


@st.cache_data
def load_names() -> dict:
    with open(os.path.join(DATA_DIR, "names.json")) as f:
        return json.load(f)


@st.cache_data
def load_breed_list() -> list:
    with open(os.path.join(DATA_DIR, "breed-list.json")) as f:
        return json.load(f)


@st.cache_data
def load_metadata() -> dict:
    with open(os.path.join(DATA_DIR, "metadata.json")) as f:
        return json.load(f)
```

- [ ] **Step 2: Create style.css with full custom styling**

Create `streamlit_app/style.css`. This is the largest single file — it contains all custom styling for the Figma palette, pet-tag cards, sidebar overrides, and Plotly container theming.

Key sections to include:

1. **Global overrides** — set `#FFF8F0` background on `.stApp`, hide Streamlit's default header/footer
2. **Sidebar** — `#FAF5EF` background, "Pets of Toronto" title styling, nav link styling with `#E8731A` orange active state
3. **Pet-tag stat cards** — circular gold gradient (`#F5C542` to `#E8A817`) cards with ring/clasp pseudo-element at top, large bold number, uppercase label, drop shadow
4. **Page titles** — dark `#2D2D2D` headings
5. **Plotly containers** — transparent backgrounds, consistent font
6. **Stat result cards** — for rarity percentile display
7. **Adopt page cards** — shelter info card styling

```css
/* === Global === */
.stApp {
    background-color: #FFF8F0;
}

.stApp header, .stApp footer {
    background-color: transparent;
}

/* Hide default Streamlit deploy button */
.stDeployButton { display: none; }

/* === Sidebar === */
[data-testid="stSidebar"] {
    background-color: #FAF5EF;
    padding-top: 2rem;
}

[data-testid="stSidebar"] .sidebar-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: #2D2D2D;
    padding: 0 1.5rem 1.5rem;
}

[data-testid="stSidebar"] .sidebar-footer {
    font-size: 0.75rem;
    color: #6B7280;
    padding: 1rem 1.5rem;
    position: absolute;
    bottom: 0;
}

/* === Pet-Tag Stat Cards === */
.pet-tag-row {
    display: flex;
    gap: 2rem;
    justify-content: center;
    flex-wrap: wrap;
    margin: 2rem 0;
}

.pet-tag {
    position: relative;
    width: 178px;
    height: 178px;
    border-radius: 50%;
    background: linear-gradient(135deg, #F5C542 0%, #E8A817 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    text-align: center;
}

/* Ring/clasp at top */
.pet-tag::before {
    content: '';
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    width: 28px;
    height: 28px;
    border: 4px solid #E8A817;
    border-radius: 50%;
    background: #FFF8F0;
}

/* Clasp connector */
.pet-tag::after {
    content: '';
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 14px;
    background: #E8A817;
    border-radius: 2px;
}

.pet-tag .number {
    font-size: 2.25rem;
    font-weight: 800;
    color: #2D2D2D;
    line-height: 1;
    margin-top: 8px;
}

.pet-tag .label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #2D2D2D;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 4px;
}

/* === Page Titles === */
.page-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: #2D2D2D;
    text-align: center;
    margin-bottom: 0.5rem;
}

.page-subtitle {
    font-size: 1rem;
    color: #6B7280;
    text-align: center;
    margin-bottom: 2rem;
}

/* === Species Toggle === */
.species-toggle {
    display: flex;
    gap: 0;
    border-radius: 24px;
    overflow: hidden;
    border: 2px solid #E8731A;
    width: fit-content;
}

.species-toggle button {
    padding: 0.5rem 1.5rem;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    background: transparent;
    color: #E8731A;
    transition: all 0.2s;
}

.species-toggle button.active {
    background: #E8731A;
    color: white;
}

/* === Info Cards (Adopt page, rarity result) === */
.info-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    margin-bottom: 1rem;
}

.info-card h3 {
    color: #2D2D2D;
    margin: 0 0 0.5rem;
}

.info-card p {
    color: #6B7280;
    margin: 0.25rem 0;
    font-size: 0.9rem;
}

.info-card a {
    color: #E8731A;
    text-decoration: none;
    font-weight: 600;
}

.info-card a:hover {
    text-decoration: underline;
}

/* === Rarity Result === */
.rarity-result {
    background: linear-gradient(135deg, #F5C542 0%, #E8A817 100%);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    margin: 2rem 0;
}

.rarity-result .percentile {
    font-size: 3rem;
    font-weight: 800;
    color: #2D2D2D;
}

.rarity-result .description {
    font-size: 1.1rem;
    color: #2D2D2D;
    margin-top: 0.5rem;
}

/* === Rising/Declining breed badges === */
.trend-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    margin: 0.25rem;
}

.trend-badge.rising {
    background: #D4EDDA;
    color: #155724;
}

.trend-badge.declining {
    background: #F8D7DA;
    color: #721C24;
}

/* === Plotly chart container overrides === */
.stPlotlyChart {
    background: transparent !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/utils.py streamlit_app/style.css
git commit -m "feat: add utils (cached data loaders) and custom CSS"
```

---

## Task 2: App Entry Point and Navigation

**Files:**
- Create: `streamlit_app/app.py`

- [ ] **Step 1: Create app.py**

Create `streamlit_app/app.py`:

```python
"""Pets of Toronto — Streamlit app entry point."""

import streamlit as st

st.set_page_config(
    page_title="Pets of Toronto",
    page_icon="\U0001f43e",
    layout="wide",
    initial_sidebar_state="expanded",
)

from utils import inject_css, load_metadata

inject_css()

# Sidebar branding
with st.sidebar:
    st.markdown('<div class="sidebar-title">Pets of Toronto</div>', unsafe_allow_html=True)

# Define pages
pages = {
    "Explore": [
        st.Page("pages/1_At_a_Glance.py", title="At a Glance", icon="\U0001f4ca"),
        st.Page("pages/2_Neighbourhoods.py", title="Neighbourhoods", icon="\U0001f3d8"),
        st.Page("pages/3_Breeds.py", title="Breeds", icon="\U0001f3f7"),
        st.Page("pages/4_Names.py", title="Names", icon="\U0001f4dd"),
        st.Page("pages/5_By_the_Numbers.py", title="By the Numbers", icon="\U0001f522"),
        st.Page("pages/6_How_Rare_Is_Your_Pet.py", title="How Rare Is Your Pet?", icon="\u2b50"),
    ],
    "Resources": [
        st.Page("pages/7_Adopt.py", title="Adopt!", icon="\u2764"),
    ],
}

nav = st.navigation(pages)

# Sidebar footer
with st.sidebar:
    meta = load_metadata()
    yr = meta["year_range"]
    st.markdown(
        f'<div class="sidebar-footer">Data last processed: {meta["generated_at"][:10]}<br>'
        f'Covering license years {yr[0]}\u2013{yr[1]}</div>',
        unsafe_allow_html=True,
    )

nav.run()
```

- [ ] **Step 2: Create placeholder page files**

Create minimal placeholder files for all 7 pages so the app can launch. Each file should contain:

```python
import streamlit as st

st.title("Page Name")
st.write("Coming soon.")
```

Create these files:
- `streamlit_app/pages/1_At_a_Glance.py`
- `streamlit_app/pages/2_Neighbourhoods.py`
- `streamlit_app/pages/3_Breeds.py`
- `streamlit_app/pages/4_Names.py`
- `streamlit_app/pages/5_By_the_Numbers.py`
- `streamlit_app/pages/6_How_Rare_Is_Your_Pet.py`
- `streamlit_app/pages/7_Adopt.py`

- [ ] **Step 3: Verify app launches**

```bash
cd streamlit_app && streamlit run app.py --server.headless true
```

Expected: App starts on port 8501, sidebar shows "Pets of Toronto" title, page navigation works, all 7 pages show placeholder text.

- [ ] **Step 4: Commit**

```bash
git add streamlit_app/
git commit -m "feat: add app entry point with navigation and placeholder pages"
```

---

## Task 3: At a Glance Page

**Files:**
- Modify: `streamlit_app/pages/1_At_a_Glance.py`

- [ ] **Step 1: Implement the At a Glance page**

Replace `streamlit_app/pages/1_At_a_Glance.py` with full implementation:

```python
"""At a Glance — hero page with stat cards and donut chart."""

import streamlit as st
import plotly.graph_objects as go
from utils import load_citywide, load_breed_list, load_names, to_title_case

citywide = load_citywide()
breed_list = load_breed_list()
names_data = load_names()

# Compute stats
total_dogs = citywide["species_split"]["DOG"]
total_cats = citywide["species_split"]["CAT"]
unique_breeds = len({entry["breed"] for entry in breed_list})

luna_count = 0
for species in names_data.values():
    if "LUNA" in species:
        for entry in species["LUNA"]:
            luna_count += entry["count"]

# Title
st.markdown('<div class="page-title">Cats & Dogs of Toronto</div>', unsafe_allow_html=True)

# Pet-tag stat cards
st.markdown(f'''
<div class="pet-tag-row">
    <div class="pet-tag">
        <span class="number">{total_dogs:,}</span>
        <span class="label">Total Dogs</span>
    </div>
    <div class="pet-tag">
        <span class="number">{total_cats:,}</span>
        <span class="label">Total Cats</span>
    </div>
    <div class="pet-tag">
        <span class="number">{unique_breeds:,}</span>
        <span class="label">Unique Breeds</span>
    </div>
    <div class="pet-tag">
        <span class="number">{luna_count:,}</span>
        <span class="label">Pets Named Luna</span>
    </div>
</div>
''', unsafe_allow_html=True)

# Donut chart
fig = go.Figure(data=[go.Pie(
    labels=["Dogs", "Cats"],
    values=[total_dogs, total_cats],
    hole=0.55,
    marker=dict(colors=["#E8A817", "#F5C542"]),
    textinfo="label+percent",
    textfont=dict(size=14),
    hovertemplate="%{label}: %{value:,}<extra></extra>",
)])
fig.update_layout(
    showlegend=False,
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    margin=dict(t=20, b=20, l=20, r=20),
    height=350,
)
st.plotly_chart(fig, use_container_width=True)
```

- [ ] **Step 2: Verify page renders**

Launch the app, navigate to "At a Glance". Verify:
- 4 gold pet-tag cards display with correct numbers
- Donut chart renders with dog/cat split
- Custom CSS applied (cream background, gold cards)

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/pages/1_At_a_Glance.py
git commit -m "feat: implement At a Glance page with pet-tag cards and donut chart"
```

---

## Task 4: Neighbourhoods Page

**Files:**
- Modify: `streamlit_app/pages/2_Neighbourhoods.py`

This is the most complex page. It has a Plotly choropleth map with mode switching and a detail sidebar.

- [ ] **Step 1: Implement the Neighbourhoods page**

Replace `streamlit_app/pages/2_Neighbourhoods.py`:

```python
"""Neighbourhoods — choropleth map with mode toggle and FSA detail sidebar."""

import streamlit as st
import plotly.express as px
import pandas as pd
from utils import load_fsa_summary, load_geojson, to_title_case

st.markdown('<div class="page-title">Neighbourhoods</div>', unsafe_allow_html=True)

fsa_data = load_fsa_summary()
geojson = load_geojson()

# Build dataframe from fsa_data
rows = []
for fsa, info in fsa_data.items():
    rows.append({
        "fsa": fsa,
        "neighbourhood": info["neighbourhood"],
        "dog_count": info["dog_count"],
        "cat_count": info["cat_count"],
        "total": info["total"],
        "dog_ratio": info["dog_ratio"],
        "per_capita_rate": info.get("per_capita_rate", 0),
        "sig_breed_dog": info.get("signature_breed", {}).get("DOG", {}).get("breed", "N/A"),
        "sig_breed_cat": info.get("signature_breed", {}).get("CAT", {}).get("breed", "N/A"),
        "top_breed_dog": info["top_breeds"]["DOG"][0]["breed"] if info["top_breeds"]["DOG"] else "N/A",
        "top_breed_cat": info["top_breeds"]["CAT"][0]["breed"] if info["top_breeds"]["CAT"] else "N/A",
    })
df = pd.DataFrame(rows)

# Controls
col_mode, col_species = st.columns([2, 1])
with col_mode:
    mode = st.selectbox("Map Mode", [
        "Dog/Cat Ratio",
        "Licensing Density",
        "Most Common Breed",
        "Signature Breed",
    ])
with col_species:
    map_species = st.radio("Species", ["DOG", "CAT"], horizontal=True, label_visibility="collapsed")

# Determine colour column and scale
if mode == "Dog/Cat Ratio":
    color_col = "dog_ratio"
    color_scale = [[0, "#3B7EA1"], [0.5, "#FFF8F0"], [1, "#E8A817"]]
    hover_data = {"dog_ratio": ":.1%", "dog_count": True, "cat_count": True}
    range_color = [0, 1]
elif mode == "Licensing Density":
    color_col = "per_capita_rate"
    color_scale = [[0, "#FFF8F0"], [1, "#E8731A"]]
    hover_data = {"per_capita_rate": ":.3f", "total": True}
    range_color = None
elif mode == "Most Common Breed":
    breed_col = "top_breed_dog" if map_species == "DOG" else "top_breed_cat"
    color_col = breed_col
    color_scale = None
    hover_data = {breed_col: True}
    range_color = None
else:  # Signature Breed
    sig_col = "sig_breed_dog" if map_species == "DOG" else "sig_breed_cat"
    color_col = sig_col
    color_scale = None
    hover_data = {sig_col: True}
    range_color = None

# Build choropleth
is_categorical = mode in ("Most Common Breed", "Signature Breed")

if is_categorical:
    fig = px.choropleth(
        df, geojson=geojson, locations="fsa",
        featureidkey="properties.CFSAUID",
        color=color_col,
        hover_name="neighbourhood",
        hover_data=hover_data,
    )
else:
    fig = px.choropleth(
        df, geojson=geojson, locations="fsa",
        featureidkey="properties.CFSAUID",
        color=color_col,
        color_continuous_scale=color_scale,
        range_color=range_color,
        hover_name="neighbourhood",
        hover_data=hover_data,
    )

fig.update_geos(
    fitbounds="locations",
    visible=False,
)
fig.update_layout(
    paper_bgcolor="rgba(0,0,0,0)",
    geo=dict(bgcolor="rgba(0,0,0,0)"),
    margin=dict(t=0, b=0, l=0, r=0),
    height=600,
)

# Layout: map + sidebar
col_map, col_detail = st.columns([3, 1])

with col_map:
    event = st.plotly_chart(fig, use_container_width=True, on_select="rerun", key="map")

# Determine selected FSA from click event
selected_fsa = None
if event and event.selection and event.selection.points:
    point = event.selection.points[0]
    loc = point.get("location")
    if loc and loc in fsa_data:
        selected_fsa = loc

with col_detail:
    if selected_fsa:
        info = fsa_data[selected_fsa]
        st.markdown(f"### {info['neighbourhood']}")
        st.markdown(f"**FSA:** {selected_fsa}")
        st.metric("Dogs", f"{info['dog_count']:,}")
        st.metric("Cats", f"{info['cat_count']:,}")
        st.metric("Dog/Cat Ratio", f"{info['dog_ratio']:.0%}")
        st.metric("Per Capita Rate", f"{info.get('per_capita_rate', 0):.3f}")

        st.markdown("**Top Dog Breeds**")
        for b in info["top_breeds"]["DOG"][:3]:
            st.write(f"- {to_title_case(b['breed'])} ({b['count']:,})")

        st.markdown("**Top Cat Breeds**")
        for b in info["top_breeds"]["CAT"][:3]:
            st.write(f"- {to_title_case(b['breed'])} ({b['count']:,})")

        sig = info.get("signature_breed", {})
        if sig:
            for sp, sb in sig.items():
                st.markdown(f"**Signature {sp.title()} Breed:** {to_title_case(sb.get('breed', 'N/A'))}")
    else:
        st.markdown("### Select a neighbourhood")
        st.write("Click an area on the map to see details.")
```

- [ ] **Step 2: Verify page renders**

Launch the app, navigate to "Neighbourhoods". Verify:
- Choropleth map renders with Toronto FSA boundaries
- Mode dropdown switches between ratio/density/breed/signature views
- Clicking an FSA region shows detail in the right sidebar
- Colour scale uses warm tones matching Figma palette

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/pages/2_Neighbourhoods.py
git commit -m "feat: implement Neighbourhoods page with choropleth map and detail sidebar"
```

---

## Task 5: Breeds Page

**Files:**
- Modify: `streamlit_app/pages/3_Breeds.py`

- [ ] **Step 1: Implement the Breeds page**

Replace `streamlit_app/pages/3_Breeds.py`:

```python
"""Breeds — trend line chart with rising/declining sections."""

import streamlit as st
import plotly.graph_objects as go
from utils import load_breed_trends, to_title_case

st.markdown('<div class="page-title">Breed Trends</div>', unsafe_allow_html=True)

trends = load_breed_trends()

# Species toggle
species = st.radio("Species", ["DOG", "CAT"], horizontal=True, label_visibility="collapsed")

species_data = trends[species]

# Search
search = st.text_input("Search breeds", placeholder="e.g. Labrador, Siamese...")

# Filter breeds for chart
if search:
    filtered = {k: v for k, v in species_data.items() if search.upper() in k.upper()}
else:
    # Show top 10 by latest year count
    latest_counts = {}
    for breed, entries in species_data.items():
        if entries:
            latest_counts[breed] = entries[-1]["count"]
    top_breeds = sorted(latest_counts, key=latest_counts.get, reverse=True)[:10]
    filtered = {k: species_data[k] for k in top_breeds}

# Line chart — share over time
fig = go.Figure()
for breed, entries in filtered.items():
    years = [e["year"] for e in entries]
    shares = [e["share"] * 100 for e in entries]  # Convert to percentage
    fig.add_trace(go.Scatter(
        x=years, y=shares,
        mode="lines+markers",
        name=to_title_case(breed),
        hovertemplate=f"{to_title_case(breed)}<br>%{{x}}: %{{y:.2f}}%<extra></extra>",
    ))

fig.update_layout(
    xaxis_title="Year",
    yaxis_title="Share (%)",
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    margin=dict(t=20, b=40, l=60, r=20),
    height=450,
    legend=dict(orientation="h", yanchor="bottom", y=-0.3),
    xaxis=dict(dtick=1),
)
st.plotly_chart(fig, use_container_width=True)

# Rising and Declining sections
st.markdown("---")
col_rise, col_decline = st.columns(2)

# Calculate YoY change for most recent year
changes = {}
for breed, entries in species_data.items():
    if len(entries) >= 2 and entries[-1].get("yoy_change") is not None:
        changes[breed] = entries[-1]["yoy_change"]

rising = sorted([(b, c) for b, c in changes.items() if c > 0], key=lambda x: x[1], reverse=True)[:10]
declining = sorted([(b, c) for b, c in changes.items() if c < 0], key=lambda x: x[1])[:10]

with col_rise:
    st.markdown("### Rising")
    for breed, change in rising:
        pct = change * 100
        st.markdown(
            f'<span class="trend-badge rising">{to_title_case(breed)} +{pct:.2f}pp</span>',
            unsafe_allow_html=True,
        )

with col_decline:
    st.markdown("### Declining")
    for breed, change in declining:
        pct = change * 100
        st.markdown(
            f'<span class="trend-badge declining">{to_title_case(breed)} {pct:.2f}pp</span>',
            unsafe_allow_html=True,
        )
```

- [ ] **Step 2: Verify page renders**

Launch the app, navigate to "Breeds". Verify:
- Species toggle switches between DOG and CAT data
- Line chart shows top 10 breeds by share % with year on x-axis
- Search filters the chart to matching breeds
- Rising/declining badges show below the chart

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/pages/3_Breeds.py
git commit -m "feat: implement Breeds page with trend chart and rising/declining sections"
```

---

## Task 6: Names Page

**Files:**
- Modify: `streamlit_app/pages/4_Names.py`

- [ ] **Step 1: Implement the Names page**

Replace `streamlit_app/pages/4_Names.py`:

```python
"""Names — leaderboard table with sparklines."""

import streamlit as st
import pandas as pd
from utils import load_names, to_title_case

st.markdown('<div class="page-title">Pet Names</div>', unsafe_allow_html=True)

names_data = load_names()

# Species toggle
species = st.radio("Species", ["DOG", "CAT"], horizontal=True, label_visibility="collapsed")

species_names = names_data[species]

# Search
search = st.text_input("Search names", placeholder="e.g. Luna, Charlie...")

# Build dataframe
rows = []
for name, entries in species_names.items():
    if search and search.upper() not in name.upper():
        continue
    sorted_entries = sorted(entries, key=lambda e: e["year"])
    latest = sorted_entries[-1]
    rank_history = [e["rank"] for e in sorted_entries]
    rows.append({
        "Name": to_title_case(name),
        "Rank": latest["rank"],
        "Count": latest["count"],
        "Year": latest["year"],
        "Trend": rank_history,
    })

df = pd.DataFrame(rows)
if not df.empty:
    df = df.sort_values("Rank").head(50)

    st.dataframe(
        df,
        column_config={
            "Name": st.column_config.TextColumn("Name", width="medium"),
            "Rank": st.column_config.NumberColumn("Rank", format="%d"),
            "Count": st.column_config.NumberColumn("Count", format="%d"),
            "Year": st.column_config.NumberColumn("Year", format="%d"),
            "Trend": st.column_config.LineChartColumn(
                "Rank Trend",
                width="medium",
                y_min=1,
                y_max=max(r for row in df["Trend"] for r in row) if not df.empty else 50,
            ),
        },
        hide_index=True,
        use_container_width=True,
    )
else:
    st.info("No names found matching your search.")
```

- [ ] **Step 2: Verify page renders**

Launch the app, navigate to "Names". Verify:
- Species toggle switches data
- Table shows name, rank, count, year, and sparkline trend column
- Search filters names
- Sparklines render inline in the table

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/pages/4_Names.py
git commit -m "feat: implement Names page with leaderboard and sparklines"
```

---

## Task 7: By the Numbers Page

**Files:**
- Modify: `streamlit_app/pages/5_By_the_Numbers.py`

- [ ] **Step 1: Implement the By the Numbers page**

Replace `streamlit_app/pages/5_By_the_Numbers.py`:

```python
"""By the Numbers — 3 stat cards showing most common species, breed, and name."""

import streamlit as st
from utils import load_citywide, to_title_case

st.markdown('<div class="page-title">By the Numbers</div>', unsafe_allow_html=True)

citywide = load_citywide()

species_split = citywide["species_split"]
top_species = max(species_split, key=species_split.get)
top_species_count = species_split[top_species]

top_breed_dog = citywide["top_breed"]["DOG"]
top_breed_cat = citywide["top_breed"]["CAT"]

top_name_dog = citywide["top_name"]["DOG"]
top_name_cat = citywide["top_name"]["CAT"]

st.markdown(f'''
<div class="pet-tag-row">
    <div class="pet-tag">
        <span class="number">{top_species_count:,}</span>
        <span class="label">{top_species.title()}s Licensed</span>
    </div>
    <div class="pet-tag">
        <span class="number">{top_breed_dog["count"]:,}</span>
        <span class="label">{to_title_case(top_breed_dog["breed"])}<br>(Top Dog Breed)</span>
    </div>
    <div class="pet-tag">
        <span class="number">{top_breed_cat["count"]:,}</span>
        <span class="label">{to_title_case(top_breed_cat["breed"])}<br>(Top Cat Breed)</span>
    </div>
</div>
''', unsafe_allow_html=True)

st.markdown("---")

col1, col2 = st.columns(2)
with col1:
    st.markdown(f'''
    <div class="info-card">
        <h3>Top Dog Name ({top_name_dog["year"]})</h3>
        <p style="font-size: 2rem; font-weight: 800; color: #E8A817;">
            {to_title_case(top_name_dog["name"])}
        </p>
        <p>{top_name_dog["count"]:,} dogs with this name</p>
    </div>
    ''', unsafe_allow_html=True)

with col2:
    st.markdown(f'''
    <div class="info-card">
        <h3>Top Cat Name ({top_name_cat["year"]})</h3>
        <p style="font-size: 2rem; font-weight: 800; color: #E8A817;">
            {to_title_case(top_name_cat["name"])}
        </p>
        <p>{top_name_cat["count"]:,} cats with this name</p>
    </div>
    ''', unsafe_allow_html=True)
```

- [ ] **Step 2: Verify page renders**

Launch the app, navigate to "By the Numbers". Verify:
- 3 pet-tag cards show top species, top dog breed, top cat breed
- Info cards show top names per species
- Cards styled with gold gradient

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/pages/5_By_the_Numbers.py
git commit -m "feat: implement By the Numbers page with stat cards"
```

---

## Task 8: How Rare Is Your Pet Page

**Files:**
- Modify: `streamlit_app/pages/6_How_Rare_Is_Your_Pet.py`

- [ ] **Step 1: Implement the How Rare Is Your Pet page**

Replace `streamlit_app/pages/6_How_Rare_Is_Your_Pet.py`:

```python
"""How Rare Is Your Pet? — cascading selects with rarity percentile result."""

import streamlit as st
from utils import load_breed_list, load_fsa_summary, to_title_case

st.markdown('<div class="page-title">How Rare Is Your Pet?</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="page-subtitle">Find out how unique your pet\'s breed is in your neighbourhood</div>',
    unsafe_allow_html=True,
)

breed_list = load_breed_list()
fsa_summary = load_fsa_summary()

# Step 1: Species
species = st.selectbox("Species", ["DOG", "CAT"])

# Step 2: Breed — filter breed_list by species, get unique breeds
breeds_for_species = sorted({
    entry["breed"] for entry in breed_list if entry["species"] == species
})
breed = st.selectbox("Breed", breeds_for_species, format_func=to_title_case)

# Step 3: Neighbourhood — filter by species + breed, get available FSAs
fsas_for_breed = sorted({
    entry["fsa"] for entry in breed_list
    if entry["species"] == species and entry["breed"] == breed
})
fsa_options = {
    fsa: f"{fsa} — {fsa_summary[fsa]['neighbourhood']}"
    for fsa in fsas_for_breed if fsa in fsa_summary
}
fsa = st.selectbox(
    "Neighbourhood",
    list(fsa_options.keys()),
    format_func=lambda x: fsa_options.get(x, x),
)

# Find result
if fsa:
    match = next(
        (e for e in breed_list
         if e["species"] == species and e["breed"] == breed and e["fsa"] == fsa),
        None,
    )
    if match:
        pct = match["rarity_percentile"]
        count = match["count"]
        neighbourhood = fsa_summary.get(fsa, {}).get("neighbourhood", fsa)

        st.markdown(f'''
        <div class="rarity-result">
            <div class="percentile">{pct:.1f}%</div>
            <div class="description">
                Rarer than <strong>{pct:.1f}%</strong> of breeds in {neighbourhood}
            </div>
            <div style="margin-top: 1rem; font-size: 0.9rem; color: #2D2D2D;">
                {count:,} licensed {to_title_case(breed)} {species.lower()}s in {neighbourhood}
            </div>
        </div>
        ''', unsafe_allow_html=True)
    else:
        st.warning("No data found for this combination.")
```

- [ ] **Step 2: Verify page renders**

Launch the app, navigate to "How Rare Is Your Pet?". Verify:
- Species dropdown works
- Breed dropdown filters to available breeds for species
- Neighbourhood dropdown filters to FSAs where that breed exists
- Result card shows rarity percentile with gold gradient styling

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/pages/6_How_Rare_Is_Your_Pet.py
git commit -m "feat: implement How Rare Is Your Pet page with cascading selects"
```

---

## Task 9: Adopt Page

**Files:**
- Modify: `streamlit_app/pages/7_Adopt.py`

- [ ] **Step 1: Implement the Adopt page**

Replace `streamlit_app/pages/7_Adopt.py`:

```python
"""Adopt! — static page with Toronto shelters and rescues."""

import streamlit as st

st.markdown('<div class="page-title">Adopt!</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="page-subtitle">Find your new best friend at a Toronto-area shelter or rescue</div>',
    unsafe_allow_html=True,
)

shelters = [
    {
        "name": "Toronto Animal Services",
        "address": "Multiple locations across Toronto",
        "url": "https://www.toronto.ca/community-people/animals-pets/adopt-a-pet/",
        "description": "The City of Toronto's official animal services. Offers dogs, cats, and other animals for adoption.",
    },
    {
        "name": "Toronto Humane Society",
        "address": "11 River Street, Toronto, ON M5A 4C2",
        "url": "https://www.torontohumanesociety.com/",
        "description": "One of the oldest humane societies in Canada. Provides shelter, medical care, and rehoming services.",
    },
    {
        "name": "Toronto Cat Rescue",
        "address": "Foster-based rescue across the GTA",
        "url": "https://www.torontocatrescue.ca/",
        "description": "Volunteer-run foster-based cat rescue. Specializes in cats and kittens from high-risk situations.",
    },
    {
        "name": "Annex Cat Rescue",
        "address": "Foster-based, Toronto",
        "url": "https://www.annexcatrescue.ca/",
        "description": "Community-based, volunteer-run cat rescue operating foster homes across Toronto.",
    },
    {
        "name": "Save Our Scruff",
        "address": "Foster-based, Toronto & GTA",
        "url": "https://saveourscruff.com/",
        "description": "Dog rescue organization focused on saving at-risk dogs and placing them in loving homes.",
    },
]

for shelter in shelters:
    st.markdown(f'''
    <div class="info-card">
        <h3>{shelter["name"]}</h3>
        <p>{shelter["description"]}</p>
        <p>{shelter["address"]}</p>
        <a href="{shelter["url"]}" target="_blank">Visit Website</a>
    </div>
    ''', unsafe_allow_html=True)
```

- [ ] **Step 2: Verify page renders**

Launch the app, navigate to "Adopt!". Verify:
- Shelter cards render with name, description, address, and link
- Cards styled with white background, rounded corners, shadow

- [ ] **Step 3: Commit**

```bash
git add streamlit_app/pages/7_Adopt.py
git commit -m "feat: implement Adopt page with shelter info cards"
```

---

## Task 10: Integration Smoke Test and Polish

- [ ] **Step 1: Full app smoke test**

Launch the app and navigate through every page:

```bash
cd streamlit_app && streamlit run app.py
```

Verify for each page:
- Page loads without errors
- Custom CSS applied (cream background, gold cards, orange accents)
- Data displays correctly
- Navigation sidebar works with correct grouping (Explore + Resources)

- [ ] **Step 2: Fix any CSS issues**

Common issues to check:
- Pet-tag cards may need size adjustments for different screen widths
- Sidebar footer positioning
- Plotly chart backgrounds matching page background
- Spacing between components

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: polish styling and complete Streamlit app integration"
```

- [ ] **Step 4: Do NOT push or merge**

The branch `feat/streamlit-app` stays local until the user explicitly approves pushing to remote. Print a summary of what was built and ask for review.
