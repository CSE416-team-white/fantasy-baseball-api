#!/usr/bin/env python3

import json
import ssl
import sys
import urllib.parse
import urllib.request

API_KEY = "cse416-team-white_irDXd_L2EmZnKDLOFdQi9cZ7bRKLDgYTZBcy_JAcePs"
BASE_URL = "https://fantasy-baseball-api.onrender.com/api/valuations"
TEST_CASES = [
    ("test_case_1", "6a0c35fa181191ddddd2e7b2"),
    ("test_case_2", "6a0c35fa181191ddddd2e7b3"),
    ("test_case_3", "6a0c35fb181191ddddd2e7b4"),
    ("test_case_4", "6a0c35fb181191ddddd2e7b6"),
    ("test_case_5", "6a0c35fc181191ddddd2e7b7"),
]


def fetch_valuation(league_id: str, player_name: str) -> dict:
    query = urllib.parse.urlencode({"name": player_name, "limit": "1"})
    url = f"{BASE_URL}/{league_id}?{query}"
    request = urllib.request.Request(
        url,
        headers={
            "x-api-key": API_KEY,
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=15,
        context=ssl._create_unverified_context(),
    ) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Usage: python3 test_case_leagues/run_valuation_test_cases.py"
            ' "Player Name"',
            file=sys.stderr,
        )
        return 1

    player_name = " ".join(sys.argv[1:])

    print("=" * 60)
    print(f"Player: {player_name}")
    print("=" * 60)

    for test_case_name, league_id in TEST_CASES:
        payload = fetch_valuation(league_id, player_name)

        valuations = payload.get("data", {}).get("valuations", [])
        valuation = valuations[0] if valuations else {}

        dollar_value = valuation.get("dollarValue")
        matched_name = valuation.get("name")
        position = valuation.get("position")
        team = valuation.get("team")

        print(f"\n[{test_case_name}]")
        print(f"League ID   : {league_id}")
        print(f"Matched Name: {matched_name}")
        print(f"Position    : {position}")
        print(f"Team        : {team}")
        print(f"Dollar Value: {dollar_value}")

        if not valuations:
            print("Status      : No valuation found")

    print("\n" + "=" * 60)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
