# The Pets of Toronto — Design Revision v2

## Overview

Post-MVP design changes based on initial review. These revisions address navigation architecture, data presentation, interaction patterns, and visual quality. Intended as input for a future Figma MCP design pass and/or implementation sprint.

---

## Global Changes

### 1. Multi-page architecture (instead of single scrollable page)
- Each section becomes its own page/route
- Requires a proper nav with page links (not anchor links)
- Consider shared layout with persistent nav bar across pages
- Pages: Home (hero), Neighbourhoods, Breeds, Names, Typical Pet, Rarity Lookup

### 2. Data label normalization — proper capitalization
- All breed names displayed in title case (e.g., "Golden Retriever" not "GOLDEN RETR")
- All pet names displayed in title case (e.g., "Luna" not "LUNA")
- Requires a normalization/display-name mapping layer in the pipeline or at render time
- Consider a `display_name` field in pipeline output, or a client-side formatter

### 3. Toggle switches instead of dropdowns
- Dog/Cat species selection should use a binary toggle switch (pill-style or segmented control)
- More intuitive for a two-option choice than a `<select>` dropdown
- Applies to: Breed Trends, Names, Rarity Lookup, Neighbourhoods map

### 4. Visual design — less bland
- Current design is functional but too minimal/sterile
- Needs more personality, warmth, visual interest
- Candidates for improvement: color usage, illustrations/icons, card shadows/depth, section backgrounds, transitions/micro-interactions
- Reference: thedogsofsf.com for editorial data-viz personality
- Consider a Figma exploration pass before implementation

---

## Neighbourhoods Section

### 5. Dog/Cat toggle on map
- Add toggle to switch map between "All", "Dogs only", "Cats only"
- When toggled, map shows only that species' data (density, breeds, etc.)

### 6. Side panel for stats (instead of hover tooltip)
- Reference: thedogsofsf.com neighborhood detail panel
- Clicking/hovering an FSA shows full stats in a persistent side panel (not a floating tooltip)
- Side panel content: neighbourhood name, dog/cat counts, top breeds, rare breeds, signature breed, per-capita rate
- Hover state on map should be minimal — just show top breed (dog and cat, or whichever species is toggled)

### 7. Map mode switching
- Map should have controls to change what's being visualized:
  - Dog/Cat ratio (current default)
  - Most common breed
  - Signature breed
  - Licensing density / per-capita rate
- Each mode changes the polygon fill logic and legend

---

## Breed Trends Section

### 8. Show % share instead of absolute counts
- Y-axis should be "% share of all [species] licenses" not raw count
- Makes trends comparable across breeds of different popularity levels

### 9. Friendlier graph style
- Current chart looks too vector/technical
- Solid lines for rising breeds, dashed lines for declining breeds
- Consider: rounded line caps, subtle area fills, smoother curves
- More whitespace, gentler color palette

### 10. Legend placement
- Move breed labels from inline (next to line endpoints) to a legend below the chart
- Clickable legend items to highlight/isolate specific breeds

### 11. Rising/declining as trend graphs
- Replace the current horizontal bar charts with small trend line graphs
- Show the actual trajectory, not just the final YoY % change value
- Include the % change as a label alongside the mini-graph

---

## Names Section

### 12. Two tables or toggle (not dropdown)
- Show dog names and cat names side-by-side as two columns/tables
- OR use a toggle switch (same as the global toggle pattern, not a dropdown)

### 13. Remove bump chart feature
- The name rank-over-time graph is ugly and not adding value
- Remove entirely — the leaderboard table with sparklines is sufficient

### 14. Better sparkline Y-axis scaling
- Current sparklines barely show rank changes because the scale is too compressed
- Use per-name local min/max for the Y domain instead of global max rank
- Makes small rank changes visible and the trend readable

---

## Not Addressed in This Revision

- Rarity Lookup section (no changes noted — current cascading select design is fine)
- Typical Pet section (no changes noted)
- Footer (no changes noted)
- Data pipeline (no changes — works correctly)

---

## Implementation Notes

- Multi-page conversion is the highest-impact architectural change — do first
- Capitalization normalization can be done as a pipeline enhancement (add `display_name` fields) or a client-side `toTitleCase()` utility
- Toggle switch is a reusable component — build once, use everywhere
- Visual design improvements are best explored in Figma first before coding
- Map side panel and mode switching are the most complex interactive changes
