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
