import csv
import os
import requests

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca"
RESOURCE_ID = "4a773296-7225-442d-9929-074549b2ccc0"
FIELDS = ["_id", "Year", "FSA", "ANIMAL_TYPE", "PRIMARY_BREED"]
PAGE_SIZE = 32000


def pull_license_data(cache_path: str) -> list[dict]:
    """Fetch license data from CKAN API, or read from cache if it exists."""
    if os.path.exists(cache_path):
        return _read_cache(cache_path)

    records = _fetch_all_records()
    _write_cache(cache_path, records)
    return records


def _fetch_all_records() -> list[dict]:
    """Page through CKAN datastore API and collect all records."""
    url = f"{CKAN_BASE}/api/3/action/datastore_search"
    records = []
    offset = 0

    while True:
        params = {"id": RESOURCE_ID, "limit": PAGE_SIZE, "offset": offset}
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        result = resp.json()["result"]
        batch = result["records"]
        if not batch:
            break
        records.extend(batch)
        offset += len(batch)
        if offset >= result["total"]:
            break

    return records


def _write_cache(path: str, records: list[dict]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for r in records:
            writer.writerow({k: r[k] for k in FIELDS})


def _read_cache(path: str) -> list[dict]:
    with open(path) as f:
        return list(csv.DictReader(f))
