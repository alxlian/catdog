from pipeline.aggregate import (
    aggregate_fsa_summary,
    aggregate_breed_trends,
    aggregate_citywide,
)

SAMPLE_RECORDS = [
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "BEAGLE"},
    {"Year": "2023", "FSA": "M5V", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "DOMESTIC SH"},
    {"Year": "2023", "FSA": "M4C", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "GOLDEN RETR"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "DOMESTIC SH"},
    {"Year": "2024", "FSA": "M5V", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "SIAMESE"},
]

NEIGHBOURHOODS = {"M5V": "King West", "M4C": "East Danforth"}
POPULATION = {"M5V": 25000, "M4C": 18000}


def test_fsa_summary_counts():
    result = aggregate_fsa_summary(SAMPLE_RECORDS, NEIGHBOURHOODS, POPULATION)
    m5v = result["M5V"]
    assert m5v["neighbourhood"] == "King West"
    assert m5v["dog_count"] > 0
    assert m5v["cat_count"] > 0
    assert "top_breeds" in m5v
    assert "rare_breeds" in m5v
    assert "signature_breed" in m5v
    assert "per_capita_rate" in m5v


def test_fsa_summary_signature_breed():
    # BEAGLE only appears in M5V — should be its signature dog breed
    result = aggregate_fsa_summary(SAMPLE_RECORDS, NEIGHBOURHOODS, POPULATION)
    m5v = result["M5V"]
    # Signature breed should exist for DOG
    assert "DOG" in m5v["signature_breed"]


def test_fsa_summary_per_capita():
    result = aggregate_fsa_summary(SAMPLE_RECORDS, NEIGHBOURHOODS, POPULATION)
    m5v = result["M5V"]
    # M5V has 8 total licenses (indices 0,1,2,3,5,6,7,8), population 25000
    expected = 8 / 25000
    assert abs(m5v["per_capita_rate"] - expected) < 0.0001


def test_breed_trends():
    result = aggregate_breed_trends(SAMPLE_RECORDS)
    # Structure: {species: {breed: [{year, count, share, yoy_change}, ...]}}
    assert "DOG" in result
    assert "PUG" in result["DOG"]
    pug_entries = result["DOG"]["PUG"]
    assert len(pug_entries) >= 1
    assert "year" in pug_entries[0]
    assert "count" in pug_entries[0]
    assert "share" in pug_entries[0]


def test_citywide():
    name_records = [
        {"ANIMAL_TYPE": "CAT", "Year": 2024, "Rank": 1, "ANIMAL_NAME": "LUNA", "AnimalCnt": 130},
        {"ANIMAL_TYPE": "DOG", "Year": 2024, "Rank": 1, "ANIMAL_NAME": "BUDDY", "AnimalCnt": 200},
    ]
    result = aggregate_citywide(SAMPLE_RECORDS, name_records)
    assert result["total_licenses"] == len(SAMPLE_RECORDS)
    assert "species_split" in result
    assert "top_breed" in result
    assert "top_name" in result
