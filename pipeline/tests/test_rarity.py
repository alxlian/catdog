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
    assert len(result) == 3

    by_breed = {r["breed"]: r for r in result}
    # PUG has count=3, BEAGLE=1, SAMOYED=1
    # PUG: 0 breeds have count > 3, so percentile = 0/3 = 0%
    # BEAGLE: 1 breed (PUG) has count > 1, so percentile = 1/3 = 33.3%
    assert by_breed["PUG"]["count"] == 3
    assert by_breed["PUG"]["rarity_percentile"] == 0.0
    assert abs(by_breed["BEAGLE"]["rarity_percentile"] - 33.3) < 1


def test_rarity_multiple_fsas():
    records = [
        {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
        {"Year": "2023", "FSA": "M4C", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    ]
    result = compute_breed_list(records)
    assert len(result) == 2
    fsas = {r["fsa"] for r in result}
    assert fsas == {"M5V", "M4C"}
