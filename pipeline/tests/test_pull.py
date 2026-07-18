import os
import csv
from unittest.mock import patch, MagicMock
from pipeline.pull import pull_license_data

def test_pull_license_data_fetches_and_caches(tmp_path):
    """pull_license_data fetches records from CKAN API and writes CSV cache."""
    cache_file = tmp_path / "licensed-dogs-cats.csv"

    fake_records = [
        {"_id": 1, "Year": 2023, "FSA": "M5V", "ANIMAL_TYPE": "DOG", "PRIMARY_BREED": "PUG"},
        {"_id": 2, "Year": 2024, "FSA": "M4C", "ANIMAL_TYPE": "CAT", "PRIMARY_BREED": "DOMESTIC SH"},
    ]
    fake_response = {
        "result": {
            "records": fake_records,
            "total": 2,
        }
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = fake_response

    with patch("pipeline.pull.requests.get", return_value=mock_resp) as mock_get:
        records = pull_license_data(str(cache_file))

    assert len(records) == 2
    assert records[0]["FSA"] == "M5V"
    assert os.path.exists(cache_file)

    # Verify cached CSV has correct contents
    with open(cache_file) as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    assert len(rows) == 2
    assert rows[1]["PRIMARY_BREED"] == "DOMESTIC SH"


def test_pull_license_data_uses_cache_if_exists(tmp_path):
    """pull_license_data reads from cache CSV if it already exists."""
    cache_file = tmp_path / "licensed-dogs-cats.csv"
    cache_file.write_text("_id,Year,FSA,ANIMAL_TYPE,PRIMARY_BREED\n1,2023,M5V,DOG,PUG\n")

    with patch("pipeline.pull.requests.get") as mock_get:
        records = pull_license_data(str(cache_file))

    mock_get.assert_not_called()
    assert len(records) == 1
    assert records[0]["PRIMARY_BREED"] == "PUG"
