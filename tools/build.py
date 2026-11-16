#!/usr/bin/env python3
"""Build the public program files from this one source.

Writes:
  program.json            meta: start date, weeks, phases
  weeks/week-NN.json      one small file per week (the page reads these)
  brief/YYYY-MM-DD.txt    one plain line per day, for the 6:00 Day Brief
  brief.json              the same lines in one file

Public repo: only the program goes here. No logs, weights, notes or health details.
"""
import json, os, datetime as dt
from urllib.parse import quote_plus

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
START = dt.date(2026, 11, 16)  # Monday, week 1 day 1
WEEKS = 12
PAGE = "https://makingperfectmoves-oss.github.io/max-fitness-today/"
VERSION = "v4.0 (week 1 start, Nov 16 2026). Refined after the knowledge base is built."


def demo(q):
    return "https://www.youtube.com/results?search_query=" + quote_plus(q)


PHASES = {
    1: ("learn", "Learn the moves", "Lighter weights. Stop every set with 2–3 good reps left. Get the form right."),
    2: ("learn", "Learn the moves", "Same as week 1, a little heavier if every rep felt clean."),
    3: ("build", "Build", "Stop each set with 1–2 good reps left. When every set reaches the top of the rep range, add the smallest weight step next time."),
    4: ("build", "Build", "Keep adding reps, then weight. Same rule: 1–2 good reps left."),
    5: ("build", "Build", "Last build week of this stretch. Push the rep ranges, keep the form."),
    6: ("deload", "Lighter week", "Two sets per lift at last week's weights, easy rides only plus a short 4×4. Let the body catch up."),
    7: ("build", "Build again", "Back to full sets. Start from week 5's weights."),
    8: ("build", "Build again", "1–2 good reps left. Add weight at the top of the range."),
    9: ("build", "Build again", "Keep climbing."),
    10: ("build", "Build again", "Keep climbing."),
    11: ("build", "Build again", "Last hard week of the block."),
    12: ("deload", "Lighter week", "Two sets per lift, easy rides. The next block is written from the knowledge base."),
}

WARMUP = [
    {"name": "Backward walk", "dose": "2 min", "cue": "Small steps, stay on the balls of your feet, let the front of the thighs work.",
     "home": "Hallway, driveway or a quiet sidewalk.", "gym": "Treadmill walking backward on low speed, or a backward sled drag.",
     "source": "Knees Over Toes", "demo": demo("Knees Over Toes Guy backward walking")},
    {"name": "Tibialis raise", "dose": "2 × 20", "cue": "Back against a wall, heels forward, lift your toes toward your shins and lower slowly.",
     "home": "Against any wall.", "gym": "Same, or a tib bar.",
     "source": "Knees Over Toes", "demo": demo("Knees Over Toes Guy tibialis raise wall")},
    {"name": "Knee-over-toe split squat", "dose": "1 × 8 per side", "cue": "Long split stance, front knee travels past the toes, back knee comes close to the floor. Hold the pull-up bar or a wall for balance.",
     "home": "Bodyweight, holding a door frame or the pull-up bar.", "gym": "Bodyweight, hold a rack for balance.",
     "source": "Knees Over Toes", "demo": demo("Knees Over Toes Guy ATG split squat")},
    {"name": "Patrick step", "dose": "1 × 10 per side", "cue": "Stand on a low step, slowly lower the other heel to the floor by bending the standing knee forward over the toes.",
     "home": "Bottom stair or a sturdy book stack.", "gym": "Aerobic step or a low plate stack.",
     "source": "Knees Over Toes", "demo": demo("Knees Over Toes Guy Patrick step")},
    {"name": "Couch stretch", "dose": "45 sec per side", "cue": "Back knee on a cushion against the wall or couch, squeeze the glute, stay tall.",
     "home": "Against the couch or a wall.", "gym": "Against a bench.",
     "source": "Knees Over Toes · mobility", "demo": demo("couch stretch hip flexor")},
    {"name": "Dead hang", "dose": "2 × 20–30 sec", "cue": "Hang from the pull-up bar, shoulders relaxed, breathe slowly.",
     "home": "Your pull-up bar.", "gym": "Pull-up bar.",
     "source": "ATHLEAN-X · Knees Over Toes", "demo": demo("dead hang shoulder health")},
]

COOLDOWN = [
    {"name": "Slow breathing", "dose": "1 min", "cue": "Lie down, breathe out longer than you breathe in.", "source": "Huberman"},
    {"name": "Deep squat hold", "dose": "45 sec", "cue": "Hold the pull-up bar or a door frame, sink into the bottom of a squat, heels down if you can.", "source": "CaliMove · Movement by David"},
    {"name": "Hamstring and chest stretch", "dose": "30 sec each side", "cue": "Easy stretch, no bouncing.", "source": "JR Stretch"},
]


def lift(name, sets, reps, rest, cue, home, gym, source, q):
    return {"name": name, "sets": sets, "reps": reps, "rest": rest, "cue": cue,
            "home": home, "gym": gym, "source": source, "demo": demo(q)}


def lift_a(deload):
    s = 2 if deload else 3
    return [
        lift("Squat", s, "8–10", 120, "Sit down between your hips, whole foot on the floor, chest up, stand up smoothly.",
             "Goblet squat holding one heavy dumbbell or kettlebell at your chest.", "Barbell back squat in a rack with safeties, 6–8 reps.",
             "Jeff Nippard · ATHLEAN-X", "Jeff Nippard goblet squat"),
        lift("Press", s, "8–10", 120, "Shoulder blades pulled back, lower slowly, press up without bouncing.",
             "Dumbbell floor press, lying on the floor, knees bent.", "Dumbbell bench press on a flat bench.",
             "Jeff Nippard · ATHLEAN-X", "ATHLEAN-X dumbbell floor press"),
        lift("Pull-up", s, "5–10", 120, "Start from a full hang, pull your chest toward the bar, lower slowly. If you get fewer than 5, do slow 5-second lowerings instead.",
             "Your pull-up bar.", "Pull-ups, or lat pulldown for 8–10.",
             "Jeff Nippard · CaliMove", "Jeff Nippard pull up technique"),
        lift("Romanian deadlift", s, "8–10", 120, "Soft knees, push your hips back, bar slides down the thighs until the hamstrings stretch, stand up tall.",
             "Barbell (or two dumbbells) from standing.", "Barbell Romanian deadlift.",
             "Jeff Nippard", "Jeff Nippard romanian deadlift"),
        lift("Bulgarian split squat", 2, "8–10 per side", 90, "Back foot on the chair seat, front knee may travel over the toes, lower under control.",
             "Back foot on the chair, dumbbells in hands when bodyweight gets easy.", "Back foot on a bench, dumbbells.",
             "Knees Over Toes · Jeff Nippard", "Knees Over Toes Guy bulgarian split squat"),
        lift("Ab wheel rollout", s, "6–10", 60, "From your knees, ribs down, roll out only as far as you can keep your lower back from sagging.",
             "Your ab wheel.", "Ab wheel or cable crunch.",
             "ATHLEAN-X", "ATHLEAN-X ab wheel rollout"),
        lift("Farmer carry", 2, "40 m (about 45 sec)", 60, "Heavy weight in each hand, walk tall, short quick steps.",
             "Two kettlebells.", "Heavy dumbbells or a trap bar.",
             "ATHLEAN-X · longevity research", "farmer carry technique"),
    ]


def lift_b(deload):
    s = 2 if deload else 3
    return [
        lift("Deadlift", s, "5–6", 150, "Bar over the middle of your foot, flat back, push the floor away, stand tall, lower with control.",
             "Barbell from the floor.", "Barbell or trap bar deadlift.",
             "Jeff Nippard · ATHLEAN-X", "Jeff Nippard deadlift technique"),
        lift("Overhead press", s, "8–10", 120, "Ribs down, press straight up, head through at the top.",
             "Seated dumbbell press, back against the chair.", "Standing dumbbell or barbell overhead press.",
             "Jeff Nippard · ATHLEAN-X", "Jeff Nippard seated dumbbell shoulder press"),
        lift("Row", s, "8–10", 90, "Flat back, pull the elbows toward your hips, pause, lower slowly.",
             "Bent-over barbell row, or one-arm dumbbell row with a hand on the chair.", "Chest-supported row or cable row.",
             "Jeff Nippard · ATHLEAN-X", "Jeff Nippard barbell row"),
        lift("Nordic curl", 2, "3–5 slow lowerings", 90, "Kneel on a cushion with your heels anchored, lower your body forward as slowly as you can, catch yourself with your hands, push back up.",
             "Heels hooked under the bed frame or a heavy couch.", "Nordic bench, or lying leg curl for 8–12.",
             "Knees Over Toes", "Knees Over Toes Guy nordic curl progression"),
        lift("Curl and triceps", 2, "10–12 each", 60, "Do one set of curls, then one set of overhead triceps extensions, then rest.",
             "Dumbbell curls, then an overhead dumbbell extension.", "Cable or dumbbell curls, then cable overhead extension.",
             "Jeff Nippard", "Jeff Nippard arms dumbbell"),
        lift("Hanging knee raise", s, "8–12", 60, "Hang from the bar, curl your knees toward your chest, lower slowly, no swinging.",
             "Your pull-up bar.", "Captain's chair or pull-up bar.",
             "ATHLEAN-X · CaliMove", "ATHLEAN-X hanging knee raise"),
        lift("Side plank", 2, "30 sec per side", 45, "Elbow under the shoulder, body in a straight line, breathe.",
             "On the floor.", "On the floor.",
             "McGill Big 3", "McGill side plank"),
        lift("Suitcase carry", 2, "30 m per side", 60, "One heavy weight in one hand, stay perfectly upright.",
             "One kettlebell.", "One heavy dumbbell.",
             "ATHLEAN-X · longevity research", "suitcase carry"),
    ]


def easy_minutes(w):
    if w in (6, 12):
        return 40
    return {1: 45, 2: 45, 3: 50, 4: 50, 5: 55}.get(w, 60)


def easy_ride(w, day):
    m = easy_minutes(w)
    return {
        "kind": "ride", "title": "Easy ride", "minutes": m,
        "summary": f"{m} min at talking pace (Zone 2).",
        "how": [
            "First 5 min very easy.",
            f"Then {m - 10} min steady: you could hold a conversation in full sentences. If you can't, slow down.",
            "Last 5 min very easy.",
        ],
        "why": "Easy riding builds the heart's base and burns fat without eating into your lifting. Most of your cardio should feel this easy.",
        "source": "Zone 2 research (Attia, Huberman)",
        "safety": "6:00 is still dark until about 6:40: front and rear lights on.",
        "swap": True,
    }


def four_by_four(w):
    deload = w in (6, 12)
    rounds = 3 if deload else 4
    effort = "7–8 out of 10" if w <= 2 else "8–9 out of 10"
    return {
        "kind": "intervals", "title": "Norwegian 4×4", "minutes": 10 + rounds * 7 + 5,
        "summary": f"{rounds} rounds of 4 min hard, 3 min easy.",
        "how": [
            "10 min warm-up, building from easy to moderate.",
            f"{rounds} rounds: 4 min hard at {effort} (only a few words at a time), then 3 min easy spinning.",
            "5–10 min easy cool-down.",
        ] + (["Weeks 1–2: learn the pace. Finish each round feeling you could have done one more."] if w <= 2 else []),
        "why": "Once a week, this is the best-studied way to raise heart fitness (VO2 max), one of the strongest markers of long life.",
        "source": "Norwegian 4×4 (Helgerud et al.)",
        "safety": "Pick a quiet stretch of road with no stop lights for the hard rounds. Lights on in the dark.",
        "swap": True,
    }


SWAP = {
    "title": "Bad-weather swap: kettlebell circuit",
    "how": [
        "5 rounds, 1 min rest between rounds (about 25 min):",
        "15 kettlebell swings",
        "8 goblet squats",
        "8 push-ups",
        "30 sec plank",
        "40 m kettlebell carry",
        "Optional: 20–30 min walk after.",
    ],
    "note": "Keep it moderate, about 6–7 out of 10, so you're fresh for the lifting days.",
    "source": "ATHLEAN-X · CaliMove",
}

REST = {
    "kind": "rest", "title": "Rest or mobility", "minutes": 15,
    "summary": "Optional 15 min mobility and a walk in the morning light. Rest is fine too.",
    "how": [
        "Cat-cow, 10 slow reps",
        "World's greatest stretch, 5 per side",
        "90/90 hip switches, 10",
        "Deep squat hold, 1 min",
        "Thoracic rotations, 8 per side",
        "Dead hang, 30 sec",
        "Then a 20–30 min walk outside, ideally in early sunlight.",
    ],
    "why": "Moving every joint through its full range keeps it that way. Morning light helps sleep and energy.",
    "source": "JR Stretch · CaliMove · Movement by David · Huberman",
    "swap": False,
}

LIFT_C = {
    "title": "Optional Lift C (Saturday, 30 min)",
    "how": ["3 rounds: 8–12 push-ups, 5–8 chin-ups, 10 goblet squats, 15 kettlebell swings. Rest 90 sec between rounds."],
    "note": "Only if you feel fresh. A third lifting day builds muscle faster.",
    "source": "Jeff Nippard (training frequency)",
}

DAILY = [
    "Get outside light within an hour of waking, 5–10 min (more if cloudy).",
    "Drink a glass of water before you train.",
    "Protein with breakfast after training.",
]


def build_week(w):
    phase_id, phase_name, rule = PHASES[w]
    deload = phase_id == "deload"
    days = {}
    for i, name in enumerate(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]):
        date = START + dt.timedelta(days=(w - 1) * 7 + i)
        if name in ("Monday", "Wednesday"):
            d = easy_ride(w, name)
        elif name == "Tuesday":
            d = {"kind": "lift", "title": "Lift A · full body", "minutes": 60,
                 "summary": "Squat · press · pull-up · Romanian deadlift · split squat · ab wheel · carry",
                 "warmup": WARMUP, "lifts": lift_a(deload), "cooldown": COOLDOWN, "swap": False}
        elif name == "Thursday":
            d = {"kind": "lift", "title": "Lift B · full body", "minutes": 60,
                 "summary": "Deadlift · overhead press · row · Nordic curl · arms · knee raise · side plank · carry",
                 "warmup": WARMUP, "lifts": lift_b(deload), "cooldown": COOLDOWN, "swap": False}
        elif name == "Friday":
            d = four_by_four(w)
        else:
            d = dict(REST)
            if name == "Saturday" and not deload:
                d = dict(REST, optional=LIFT_C)
        d = dict(d, date=date.isoformat(), weekday=name)
        days[name] = d
    return {"week": w, "phase": {"id": phase_id, "name": phase_name, "rule": rule},
            "days": days, "swap": SWAP, "daily": DAILY}


def brief_line(w, d):
    url = f"{PAGE}?date={d['date']}"
    if d["kind"] == "lift":
        main = f"{d['title']}, {d['minutes']} min (home; gym version on the card)"
    elif d["kind"] == "rest":
        main = "Rest day. Optional 15 min mobility and a walk in the morning light"
    elif d["kind"] == "ride":
        main = f"{d['title']}, {d['summary'][:-1]}. Bad weather: kettlebell circuit"
    else:
        main = f"{d['title']}: {d['summary']} About {d['minutes']} min. Bad weather: kettlebell circuit"
    return f"Workout (week {w}, {d['weekday']}): {main}. Card: {url} Reply: done, skip, or your numbers."


def main():
    os.makedirs(os.path.join(ROOT, "weeks"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "brief"), exist_ok=True)
    lines = {}
    for w in range(1, WEEKS + 1):
        week = build_week(w)
        with open(os.path.join(ROOT, "weeks", f"week-{w:02d}.json"), "w") as f:
            json.dump(week, f, ensure_ascii=False, indent=1)
        for d in week["days"].values():
            line = brief_line(w, d)
            lines[d["date"]] = line
            with open(os.path.join(ROOT, "brief", d["date"] + ".txt"), "w") as f:
                f.write(line + "\n")
    # Brief lines keep going past week 12 by repeating weeks 7-12, up to a year.
    for w in range(WEEKS + 1, 53):
        src = 7 + (w - WEEKS - 1) % 6
        week = build_week(src)
        for i, d in enumerate(week["days"].values()):
            date = START + dt.timedelta(days=(w - 1) * 7 + i)
            d = dict(d, date=date.isoformat())
            line = brief_line(w, d)
            lines[d["date"]] = line
            with open(os.path.join(ROOT, "brief", d["date"] + ".txt"), "w") as f:
                f.write(line + "\n")
    with open(os.path.join(ROOT, "brief.json"), "w") as f:
        json.dump(lines, f, ensure_ascii=False, indent=1)
    meta = {"version": VERSION, "timeZone": "America/New_York", "startDate": START.isoformat(), "weeks": WEEKS,
            "phases": {str(k): v[1] for k, v in PHASES.items()},
            "afterLastWeek": "Repeats weeks 7–12 until the next block is published."}
    with open(os.path.join(ROOT, "program.json"), "w") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
