#!/usr/bin/env python3
"""Checks the built program: every day exists, every lift has home, gym and a source, every brief line exists."""
import json, os, sys, datetime as dt
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meta = json.load(open(os.path.join(ROOT, "program.json")))
start = dt.date.fromisoformat(meta["startDate"])
errors = []
for w in range(1, meta["weeks"] + 1):
    week = json.load(open(os.path.join(ROOT, "weeks", f"week-{w:02d}.json")))
    if len(week["days"]) != 7: errors.append(f"week {w}: {len(week['days'])} days")
    for name, d in week["days"].items():
        for k in ("title", "kind", "minutes", "summary", "date"): 
            if not d.get(k): errors.append(f"week {w} {name}: missing {k}")
        for ex in d.get("lifts", []) + d.get("warmup", []):
            for k in ("home", "gym", "source", "demo", "cue"):
                if not ex.get(k): errors.append(f"week {w} {name} {ex.get('name')}: missing {k}")
for i in range(52 * 7):
    day = (start + dt.timedelta(days=i)).isoformat()
    if not os.path.exists(os.path.join(ROOT, "brief", day + ".txt")): errors.append("no brief line for " + day)
banned = ["injur", "pain in", "diagnos", "@", "kg)", "lb)", "logged"]
for folder in ("weeks", "brief"):
    for f in os.listdir(os.path.join(ROOT, folder)):
        t = open(os.path.join(ROOT, folder, f)).read().lower()
        for b in banned:
            if b in t: errors.append(f"{folder}/{f}: contains '{b}'")
print("\n".join(errors) if errors else f"OK: {meta['weeks']} weeks, 364 brief lines, every lift has home, gym and a source")
sys.exit(1 if errors else 0)
