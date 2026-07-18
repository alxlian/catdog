from collections import defaultdict


def compute_breed_list(records: list[dict]) -> list[dict]:
    """Compute all (species, breed, FSA) combos with counts and rarity percentiles.

    Rarity percentile = % of breed combos in that FSA+species with count
    strictly greater than this breed's count. High % = rare breed.
    """
    counts = defaultdict(int)
    for r in records:
        key = (r["FSA"], r["ANIMAL_TYPE"], r["PRIMARY_BREED"])
        counts[key] += 1

    fsa_species_counts = defaultdict(list)
    for (fsa, species, breed), count in counts.items():
        fsa_species_counts[(fsa, species)].append((breed, count))

    result = []
    for (fsa, species), breeds in fsa_species_counts.items():
        total_breeds = len(breeds)
        for breed, count in breeds:
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
