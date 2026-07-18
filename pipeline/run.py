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
