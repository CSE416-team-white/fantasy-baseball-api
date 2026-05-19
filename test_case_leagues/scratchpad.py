import json
import difflib
import unicodedata

SOURCE_FILE = "after_100_players_taken.json"
TARGET_FILE = "after_130_players_taken.json"
OUTPUT_FILE = "merged_130_players.json"


def normalize(name):
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = name.lower()
    name = name.replace(".", "")
    return " ".join(name.split())


def get_best_name_match(source_name, target_names, cutoff=0.75):
    normalized_targets = {normalize(name): name for name in target_names}

    matches = difflib.get_close_matches(
        normalize(source_name), normalized_targets.keys(), n=1, cutoff=cutoff
    )

    if not matches:
        return None

    return normalized_targets[matches[0]]


def fix_player_names(source_players, target_players):
    target_names = [p["playerName"] for p in target_players]

    replacements = {}

    for source_player in source_players:
        source_name = source_player["playerName"]
        matched_name = get_best_name_match(source_name, target_names)

        if matched_name and matched_name != source_name:
            replacements[matched_name] = source_name

    for player in target_players:
        old_name = player["playerName"]

        if old_name in replacements:
            player["playerName"] = replacements[old_name]

    return replacements


with open(SOURCE_FILE, "r", encoding="utf-8") as f:
    source_data = json.load(f)

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    target_data = json.load(f)


all_replacements = {}

for section in ["taken_players", "draft_picks"]:
    if section in source_data and section in target_data:
        replacements = fix_player_names(source_data[section], target_data[section])

        for old, new in replacements.items():
            all_replacements[(section, old)] = new


with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(target_data, f, indent=2, ensure_ascii=False)


print("Replacements made:")
for (section, old), new in all_replacements.items():
    print(f"{section}: {old} -> {new}")

print(f"\nSaved merged file to: {OUTPUT_FILE}")
