"""Compare a saved request with an already-fetched public availability catalog."""

import argparse
import json
import sys
import time
from pathlib import Path

from preflight import availability_blocker


def check_request(request, catalog, now):
    if not isinstance(request, dict):
        return "INVALID_REQUEST"
    model, ratio, size = (request.get(key) for key in ("model", "ratio", "size"))
    if not all(isinstance(value, str) and value.strip() for value in (model, ratio, size)):
        return "INVALID_REQUEST"

    models = catalog.get("models") if isinstance(catalog, dict) else None
    observation = models.get(model) if isinstance(models, dict) else None
    blocker = availability_blocker(observation, now)
    if blocker is not None:
        return blocker

    formats = observation.get("available_formats")
    if not isinstance(formats, list):
        return "WAIT_FORMAT"
    if any(isinstance(item, dict) and item.get("ratio") == ratio and item.get("size") == size
           for item in formats):
        return "REVIEW_FUNDING"
    return "WAIT_FORMAT"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("request", type=Path, help="Saved generation JSON. Read the public catalog on stdin.")
    args = parser.parse_args()
    try:
        request = json.loads(args.request.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        print("INVALID_REQUEST")
        return 2
    try:
        catalog = json.load(sys.stdin)
    except ValueError:
        catalog = None
    decision = check_request(request, catalog, time.time())
    print(decision)
    if decision == "INVALID_REQUEST":
        return 2
    return 0 if decision == "REVIEW_FUNDING" else 1


if __name__ == "__main__":
    sys.exit(main())
