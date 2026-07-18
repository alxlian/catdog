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
