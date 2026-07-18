from pipeline.names import load_names, aggregate_names

def test_load_names_parses_csv(tmp_path):
    csv_file = tmp_path / "names.csv"
    csv_file.write_text(
        "_id,ANIMAL_TYPE,Year,Rank,ANIMAL_NAME,AnimalCnt\n"
        "1,CAT,2020,1,CHARLIE,123\n"
        "2,DOG,2020,1,BUDDY,200\n"
        "3,CAT,2021,1,LUNA,130\n"
    )
    records = load_names(str(csv_file))
    assert len(records) == 3
    assert records[0]["ANIMAL_NAME"] == "CHARLIE"
    assert records[0]["Year"] == 2020
    assert records[0]["AnimalCnt"] == 123


def test_aggregate_names_produces_output_structure():
    records = [
        {"ANIMAL_TYPE": "CAT", "Year": 2020, "Rank": 1, "ANIMAL_NAME": "CHARLIE", "AnimalCnt": 123},
        {"ANIMAL_TYPE": "CAT", "Year": 2020, "Rank": 2, "ANIMAL_NAME": "LUNA", "AnimalCnt": 100},
        {"ANIMAL_TYPE": "CAT", "Year": 2021, "Rank": 1, "ANIMAL_NAME": "LUNA", "AnimalCnt": 130},
        {"ANIMAL_TYPE": "DOG", "Year": 2020, "Rank": 1, "ANIMAL_NAME": "BUDDY", "AnimalCnt": 200},
    ]
    result = aggregate_names(records)

    # Structure: {species: {name: [{year, rank, count}, ...]}}
    assert "CAT" in result
    assert "DOG" in result
    assert "LUNA" in result["CAT"]
    assert len(result["CAT"]["LUNA"]) == 2
    assert result["CAT"]["LUNA"][0] == {"year": 2020, "rank": 2, "count": 100}
    assert result["CAT"]["LUNA"][1] == {"year": 2021, "rank": 1, "count": 130}
