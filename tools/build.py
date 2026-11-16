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
VERSION = "v4.1 (Nov 16 2026): videos, how-to, longevity, new cool-downs. Refined after the knowledge base is built."


def search(q):
    return "https://www.youtube.com/results?search_query=" + quote_plus(q)


def yt(vid, t, title, by=""):
    """A YouTube video that starts at the right moment (t in seconds)."""
    return {"yt": vid, "t": t, "title": title, "by": by}


def page(url, title, by):
    """A written guide or a short loop on another site."""
    return {"url": url, "title": title, "by": by}


# ---------- Evidence (study names; links where checked) ----------
EV = {
    "acsm": {"text": "ACSM review of resistance training (2026): progressive overload, 2+ days a week, sets near failure build muscle and strength.",
             "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/"},
    "volume": {"text": "Roughly 10+ hard sets per muscle per week, spread over 2+ days, builds muscle well (Schoenfeld and colleagues' volume research, used by Jeff Nippard)."},
    "grip": {"text": "Low grip strength predicted earlier death across 17 countries (Leong et al., Lancet, 2015)."},
    "balance": {"text": "Not being able to stand 10 seconds on one leg in mid-life was linked to higher death risk (Araújo et al., BJSM, 2022)."},
    "sitrise": {"text": "The sit-to-rise test (getting up off the floor) tracked with survival (Brito et al., Eur J Prev Cardiol, 2012)."},
    "vo2": {"text": "Cardio fitness was one of the strongest predictors of long life in 120,000 treadmill tests (Mandsager et al., JAMA Netw Open, 2018)."},
    "4x4": {"text": "4×4 intervals raised VO2 max more than steady riding at the same total work (Helgerud et al., Med Sci Sports Exerc, 2007)."},
    "zone2": {"text": "Most endurance training in successful programs is easy (about 80%), with a small hard dose (Seiler's polarized-training research)."},
    "sigh": {"text": "5 min a day of cyclic sighing improved mood more than mindfulness meditation in a month-long trial (Balban et al., Cell Rep Med, 2023)."},
    "cold": {"text": "Cold water right after lifting reduced muscle growth over 12 weeks (Roberts et al., J Physiol, 2015)."},
    "cooldown": {"text": "A cool-down does little for soreness, but settles heart rate and is the best slot for mobility (Van Hooren and Peake, Sports Med, 2018).",
                 "url": "https://rd.springer.com/content/pdf/10.1007/s40279-018-0916-2.pdf"},
    "steps": {"text": "Health benefits of daily steps level off around 7,000–8,000 (Paluch et al., Lancet Public Health, 2022)."},
    "protein": {"text": "Protein above about 1.6 g per kg of body weight a day adds little more muscle (Morton et al., BJSM, 2018)."},
}


def ev(*keys):
    return [EV[k] for k in keys]


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

# ---------- Warm-up for lifting days: four parts, about 12 minutes ----------
def move(name, dose, cue, home, gym, source, video=None, why=""):
    d = {"name": name, "dose": dose, "cue": cue, "home": home, "gym": gym, "source": source, "demo": search(name + " " + source.split(" · ")[0])}
    if video: d["video"] = video
    if why: d["why"] = why
    return d


WARMUP = [
    {"part": "Raise temperature", "minutes": 2, "goal": "Get warm and a little out of breath.", "items": [
        move("March or jumping jacks", "1 min", "Easy pace, arms swinging. You should feel warm, not tired.",
             "In place, on the floor.", "Same, or 2 min on a bike or rower.", "ACSM warm-up guidance"),
        move("Bodyweight squats", "10 slow reps", "Sit between your hips, heels down, stand tall.",
             "Floor.", "Floor.", "Jeff Nippard"),
    ]},
    {"part": "Joint armor", "minutes": 5, "goal": "Knees, ankles and shins ready for load.", "items": [
        move("Backward walk", "1–2 min", "Small steps on the balls of your feet. You'll feel the front of your thighs work.",
             "Hallway, driveway or a quiet sidewalk.", "Treadmill walking backward on low speed, or a backward sled drag.",
             "Knees Over Toes", yt("BGoW1IQ4y2E", 0, "Backward walking and tibialis raises"),
             "Strengthens the knee in its safest direction and warms it up fast."),
        move("Tibialis raise", "1 × 20", "Back against a wall, heels a foot forward, lift your toes toward your shins, lower slowly.",
             "Against any wall.", "Same, or a tib bar.", "Knees Over Toes", yt("BGoW1IQ4y2E", 0, "Backward walking and tibialis raises"),
             "The shin muscle is the knee's and ankle's shock absorber."),
        move("Knee-over-toe split squat", "1 × 6 per side", "Long split stance, front knee travels past the toes, back knee drops toward the floor. Hold the chair or a wall for balance.",
             "Bodyweight, one hand on the chair back.", "Bodyweight, hold a rack for balance.",
             "Knees Over Toes", yt("ZUFAAjqiMvQ", 0, "ATG split squat and tibialis raise"),
             "Trains the knee where it's usually weakest: fully bent."),
        move("Patrick step (floor version)", "1 × 10 per side", "Stand on one foot, slowly bend that knee forward over the toes until the other heel touches the floor in front.",
             "Floor; hold the chair for balance.", "Aerobic step or a low plate stack.",
             "Knees Over Toes", yt("16AjEFQADvI", 0, "Patrick step"),
             "Builds the muscle just above the knee that protects it on stairs and step-downs."),
    ]},
    {"part": "Rehearse the patterns", "minutes": 3, "goal": "Hips, back and shoulders through the ranges you'll lift in.", "items": [
        move("Lunge and reach", "4 per side", "Step into a long lunge, reach the same-side arm up and rotate toward the front leg.",
             "Floor.", "Floor.", "ATHLEAN-X", yt("AGj7wEn1jLo", 22, "Dynamic lunge and reach", "ATHLEAN-X")),
        move("Squat to stand", "5 slow reps", "Hold your toes, drop the hips into a squat, chest up, then straighten the legs.",
             "Floor.", "Floor.", "CaliMove", yt("x81rwumG3bE", 108, "Squat-to-toe-touch mobility", "CaliMove")),
        move("Shoulder prep", "8 arm circles, 6 swings", "Big slow circles forward and back, then cross-body arm swings.",
             "Floor.", "Or a light band pull-apart.", "Jeff Nippard", yt("E81GN-3A8XM", 442, "Dynamic shoulder preparation", "Jeff Nippard")),
        move("Dead hang", "20–30 sec", "Hang from the pull-up bar, shoulders relaxed, breathe slowly. No bar: hold two heavy kettlebells at your sides for 30 sec.",
             "Your pull-up bar (no bar: heavy kettlebell hold).", "Pull-up bar.", "ATHLEAN-X · Knees Over Toes",
             why="Opens the shoulders and builds grip, a marker of long life."),
    ]},
    {"part": "Ramp-up sets", "minutes": 2, "goal": "Groove the first lift before the real sets.", "items": [
        move("First lift, light", "8 reps at about half your working weight", "Same form as the real sets, nice and smooth.",
             "Your first lift today.", "Your first lift today.", "Jeff Nippard · ATHLEAN-X"),
        move("First lift, medium", "4 reps at about three-quarters", "Then rest 1 minute and start set 1.",
             "Your first lift today.", "Your first lift today.", "Jeff Nippard · ATHLEAN-X"),
    ]},
]

# ---------- Cool-downs (research thread, Nov 16) ----------
COOL_LIFT = {
    "minutes": 8, "goal": "Settle the heart rate, use the warm muscles for mobility, and practice the moves that predict a long life.",
    "items": [
        move("Easy walk outside", "2 min", "Step outside if you can: this doubles as your morning light.",
             "Outside, or around the house.", "Outside or a slow treadmill.", "Huberman"),
        move("Couch stretch", "30 sec per side", "Back knee on a cushion against the couch or wall, squeeze that glute, stay tall.",
             "Against the couch or a wall.", "Against a bench.", "JR Stretch", yt("dWOgSebEAAM", 172, "Couch hip-flexor stretch", "JR Stretch")),
        move("90/90 hip switches", "6 per side", "Sit with both knees bent at 90°, rotate both knees side to side, stay tall.",
             "Floor.", "Floor or a mat.", "JR Stretch", yt("fdBakoYR0GU", 203, "90/90 hip switches", "JR Stretch")),
        move("Open book", "5 per side", "Lie on your side, knees bent, open the top arm across to the other side, follow it with your eyes.",
             "Floor.", "Floor or a mat.", "JR Stretch", yt("fdBakoYR0GU", 146, "Side-lying open book", "JR Stretch")),
        move("Dead hang", "30 sec", "Relaxed hang, breathe. No bar: lat stretch on all fours (sink hips back, arms long).",
             "Your pull-up bar (no bar: all-fours lat stretch).", "Pull-up bar.", "Movement by David",
             yt("eQHmKJh20_c", 403, "All-fours lat stretch (no-bar option)", "Movement by David")),
        move("Single-leg stand", "30 sec per side", "Stand on one foot, tall. When it's easy, close your eyes.",
             "Floor.", "Floor.", "Peter Attia · Knees Over Toes", why=EV["balance"]["text"]),
        move("Floor get-ups", "3 reps", "Sit down on the floor and stand back up using as little help from your hands as you can.",
             "Floor.", "Floor or a mat.", "Movement by David · CaliMove", why=EV["sitrise"]["text"]),
        move("Physiological sighs", "1 min", "Two inhales through the nose (the second one short, to top up), then one long slow exhale through the mouth. Repeat.",
             "Sitting or lying down.", "Sitting or lying down.", "Huberman", why=EV["sigh"]["text"]),
    ],
}

COOL_RIDE = {
    "minutes": 10, "goal": "Let the heart rate come down slowly, then loosen what the bike tightens.",
    "items": [
        move("Easy spin home", "5 min", "Lowest effort, light gear, breathing back to normal.",
             "On the bike.", "On the bike.", "USA Cycling"),
        move("Knee-to-wall ankle stretch", "45 sec per side", "Foot a hand's width from the wall, push the knee toward the wall, heel down.",
             "Against any wall.", "Against any wall.", "Knees Over Toes"),
        move("Hamstring rocks", "8 per side", "Soft knees, hinge at the hips and rock gently into the back of the leg.",
             "Floor.", "Floor.", "JR Stretch", yt("dWOgSebEAAM", 99, "Hinged hamstring rocks", "JR Stretch")),
        move("Half-kneeling hip flexor", "30 sec per side", "Back knee down on a cushion, tuck the hips under, lean forward a little.",
             "Floor, cushion under the knee.", "Floor or a mat.", "Movement by David",
             yt("eQHmKJh20_c", 26, "Half-kneeling hip-flexor lunge", "Movement by David")),
        move("Calf stretch", "30 sec per side", "Hands on the wall, back leg straight, heel down.",
             "Against any wall.", "Against any wall.", "JR Stretch"),
        move("Physiological sighs", "1 min", "Two nose inhales, one long exhale.",
             "Anywhere.", "Anywhere.", "Huberman", why=EV["sigh"]["text"]),
    ],
}

# ---------- Main lifts ----------
def lift(name, sets, reps, rest, why, setup, steps, avoid, progress, home, gym, source, video, evidence,
         gym_video=None, no_gear=None, limits=None):
    d = {"name": name, "sets": sets, "reps": reps, "rest": rest, "why": why, "setup": setup, "steps": steps,
         "avoid": avoid, "progress": progress, "home": home, "gym": gym, "source": source,
         "cue": steps[0], "video": video, "evidence": evidence, "demo": search(name + " " + source.split(" · ")[0])}
    if gym_video: d["gymVideo"] = gym_video
    if no_gear: d["noGear"] = no_gear
    if limits: d["limits"] = limits
    return d


DOUBLE = "When every set reaches the top of the rep range with good form, add the smallest weight step next time."


def lift_a(deload):
    s = 2 if deload else 3
    return [
        lift("Goblet squat", s, "8–10", 120,
             "The squat builds the whole lower body: thighs, glutes and the knees that carry you for life.",
             "Hold one heavy dumbbell or kettlebell upright against your chest, feet shoulder-width, toes slightly out.",
             ["Breathe in and brace as if about to be poked in the stomach.", "Sit down between your hips, knees following the toes, whole foot on the floor.",
              "Go as low as you can keep your chest up, then stand up smoothly."],
             "Heels lifting, knees caving in, rounding the lower back at the bottom.",
             DOUBLE + " Past about 45 kg the dumbbell gets awkward to hold: switch to a front-loaded barbell squat.",
             "Goblet squat with one dumbbell or kettlebell.", "Barbell back squat in a rack with safeties, or hack squat, 6–8 reps.",
             "ATHLEAN-X · Jeff Nippard",
             page("https://learn.athleanx.com/articles/legs-for-men/how-to-do-goblet-squats", "How to do goblet squats", "ATHLEAN-X"),
             ev("acsm", "volume"), gym_video=yt("kIXcoivzGf8", 276, "Hack squat", "Jeff Nippard")),
        lift("Floor press", s, "8–10", 120,
             "Your pressing strength for chest, shoulders and triceps. The floor stops the elbows at a shoulder-friendly depth, so no bench is needed.",
             "Lie on the floor, knees bent, a dumbbell in each hand over your chest.",
             ["Pull your shoulder blades back and down into the floor.", "Lower slowly until your upper arms touch the floor, elbows about 45° from your body.",
              "Pause a moment, then press up without bouncing."],
             "Flaring the elbows straight out, bouncing the arms off the floor.",
             DOUBLE,
             "Dumbbell floor press, lying on the floor.", "Flat dumbbell bench press.",
             "ATHLEAN-X · Jeff Nippard",
             page("https://learn.athleanx.com/articles/how-to-do-the-floor-press", "How to do the floor press", "ATHLEAN-X"),
             ev("acsm"), gym_video=yt("fGm-ef-4PVk", 215, "Flat dumbbell bench press", "Jeff Nippard")),
        lift("Pull-up", s, "5–10", 120,
             "The best upper-back and arm builder there is, and it trains the grip that tracks with a long life.",
             "Hands on the bar a little wider than your shoulders, palms facing away.",
             ["Start from a full hang, shoulders pulled down away from the ears.", "Pull your chest toward the bar, elbows driving toward your back pockets.",
              "Lower slowly, about 3 seconds, all the way to a full hang."],
             "Kicking or swinging, half reps, dropping fast.",
             "Fewer than 5? Jump to the top and lower slowly for 5 seconds, 5 reps (no band needed). When you hit 3 × 10, hold a dumbbell between your feet.",
             "Your pull-up bar.", "Pull-ups, or neutral-grip lat pulldown for 8–10.",
             "Jeff Nippard · CaliMove", yt("Hdc7Mw6BIEE", 0, "The best way to do pull-ups for a wide back"),
             ev("acsm", "grip"), gym_video=yt("jLvqKgW-_G8", 239, "Neutral-grip lat pulldown", "Jeff Nippard"),
             no_gear="No bar: one-arm dumbbell row, other hand on the chair seat, 10 per side."),
        lift("Romanian deadlift", s, "8–10", 120,
             "Builds the hamstrings and glutes and teaches the hip hinge that protects your back when you lift anything.",
             "Stand tall holding the barbell (or two dumbbells) in front of your thighs, feet hip-width.",
             ["Soften the knees and push your hips straight back.", "Let the weight slide down your thighs, back flat, until the hamstrings stretch (usually just below the knee).",
              "Squeeze the glutes and stand up tall."],
             "Rounding the back, bending the knees into a squat, letting the weight drift away from the legs.",
             DOUBLE,
             "Barbell or two dumbbells.", "Barbell Romanian deadlift.",
             "ATHLEAN-X · Jeff Nippard", yt("uYG3CneV-Pw", 179, "Dumbbell Romanian deadlift", "ATHLEAN-X"),
             ev("acsm")),
        lift("Bulgarian split squat", 2, "8–10 per side", 90,
             "One leg at a time: strength, balance and knee health in one move, with no bench needed.",
             "Stand about two feet in front of the chair, top of your back foot on the seat.",
             ["Drop the back knee straight down.", "Let the front knee travel forward over the toes as you go lower.",
              "Push through the whole front foot to stand up. Do all reps on one side, then switch."],
             "Front heel lifting, wobbling side to side, a chair that slides (put it against a wall).",
             "Bodyweight until 10 clean reps, then hold dumbbells. " + DOUBLE,
             "Back foot on the chair seat, dumbbells when bodyweight gets easy.", "Back foot on a bench, dumbbells.",
             "Knees Over Toes · Jeff Nippard", yt("_yWl3DxRCJY", 0, "Bulgarian split squat guide"),
             ev("acsm", "balance")),
        lift("Ab wheel rollout", s, "6–10", 60,
             "Trains the core to stop the lower back from arching: the core's real job when you lift and carry.",
             "Kneel on a folded towel, hands on the wheel under your shoulders.",
             ["Tuck the ribs down and squeeze the glutes.", "Roll out slowly only as far as your lower back stays flat.",
              "Pull back with your abs, not your hips."],
             "Lower back sagging, hips shooting back first on the return.",
             "Roll a little farther each week. 3 × 10 to full stretch from the knees is excellent.",
             "Your ab wheel.", "Ab wheel, or cable crunch for 10–12.",
             "ATHLEAN-X", yt("5I3LgiumTJM", 0, "Ab wheel rollout progression"),
             ev("acsm")),
        lift("Farmer carry", 2, "40 m (about 45 sec)", 60,
             "Grip, core, shoulders and posture all at once. Grip strength is one of the best-studied markers of a long life.",
             "A heavy kettlebell in each hand, handles in the middle of your palms.",
             ["Stand tall, shoulders down and back.", "Walk with short, quick steps, eyes forward.", "Set them down with a flat back."],
             "Leaning, shrugging, letting the weights swing.",
             "Add weight when 40 m feels easy. A strong long-term target: your body weight split between both hands.",
             "Two kettlebells (or dumbbells).", "Heavy dumbbells or a trap bar.",
             "ATHLEAN-X · Peter Attia", yt("R6gZoAzAhCg", 378, "Farmer carry", "ATHLEAN-X"),
             ev("grip")),
    ]


def lift_b(deload):
    s = 2 if deload else 3
    return [
        lift("Deadlift", s, "5–6", 150,
             "The biggest whole-body strength lift: back, hips, legs and grip. Done well, it makes everyday lifting safe.",
             "Bar over the middle of your feet, feet hip-width, hands just outside the legs.",
             ["Shins to the bar, hips down until the back is flat, chest up.", "Take the slack out of the bar, then push the floor away.",
              "Stand tall, then lower with control, hips back first."],
             "Rounding the back, jerking the bar, letting it drift forward.",
             "Start light and add the smallest step each session while every rep looks the same. " + DOUBLE,
             "Barbell from the floor.", "Barbell or trap bar deadlift.",
             "Jeff Nippard · ATHLEAN-X", yt("VL5Ab0T07e4", 0, "Build a bigger deadlift with perfect technique"),
             ev("acsm", "grip")),
        lift("Overhead press", s, "8–10", 120,
             "Builds the shoulders and keeps them strong overhead, a range many people lose with age.",
             "Sit on the chair, back flat against its upright back, a dumbbell in each hand at shoulder height.",
             ["Brace, ribs down.", "Press straight up until the arms are long, head slightly forward at the top.", "Lower slowly to the shoulders."],
             "Arching the lower back off the chair, pressing forward instead of up.",
             DOUBLE,
             "Seated dumbbell press, back against the chair.", "Standing dumbbell or barbell overhead press.",
             "ATHLEAN-X · Jeff Nippard", yt("cxn0l7ejTbc", 140, "Dumbbell overhead press", "ATHLEAN-X"),
             ev("acsm")),
        lift("Row", s, "8–10", 90,
             "Balances all the pressing and sitting: upper back, rear shoulders and posture.",
             "Bent over with a flat back holding the barbell, or one hand on the chair seat with a dumbbell in the other.",
             ["Let the arm(s) hang long.", "Pull the elbows toward your hips, squeeze the shoulder blades together.", "Pause, then lower slowly."],
             "Jerking the torso up, shrugging toward the ears.",
             DOUBLE,
             "Bent-over barbell row, or one-arm dumbbell row with a hand on the chair.", "Chest-supported row or cable row.",
             "Jeff Nippard · ATHLEAN-X", yt("jLvqKgW-_G8", 533, "Rows (chest-supported shown)", "Jeff Nippard"),
             ev("acsm", "volume")),
        lift("Knee strength", 2, "6–10", 90,
             "Strengthens the front of the knee and thigh through a long range, a Knees Over Toes staple for durable knees.",
             "Kneel on a folded towel, knees hip-width, body straight from knees to head.",
             ["Lean back slowly, hips straight, only as far as you can control.", "Come back up the same way.",
              "Then 1 set of single-leg glute bridges, 10 per side, for the back of the leg."],
             "Bending at the hips, dropping past the range you control.",
             "Lean a little farther back each week. Add a small weight at your chest when 10 reps are easy.",
             "Reverse Nordic on the floor, then single-leg glute bridges.", "Nordic curl on a Nordic bench, or lying leg curl for 8–12.",
             "Knees Over Toes", yt("zl1m3DoiAec", 0, "Reverse Nordic"),
             ev("acsm"), limits="Coach-led drill. Long-range knee work is well supported; research on this exact drill is limited."),
        lift("Curl and triceps", 2, "10–12 each", 60,
             "Direct arm work adds size the big lifts miss, for little time.",
             "Stand with a dumbbell in each hand.",
             ["Curl both dumbbells up, elbows still, lower slowly.", "Then one overhead triceps extension: one dumbbell held in both hands behind your head, press up.",
              "That's one round. Rest, repeat."],
             "Swinging the body, elbows drifting forward on curls.",
             DOUBLE,
             "Dumbbell curls, then an overhead dumbbell extension.", "Cable or dumbbell curls, then cable overhead extension.",
             "ATHLEAN-X · Jeff Nippard",
             page("https://learn.athleanx.com/articles/how-to-do-bicep-curls", "How to do bicep curls", "ATHLEAN-X"),
             ev("volume")),
        lift("Hanging knee raise", s, "8–12", 60,
             "Lower abs and grip together, plus a free shoulder stretch from the hang.",
             "Hang from the bar, shoulders active.",
             ["Curl your knees up toward your chest, rounding the lower back a little.", "Lower slowly, no swinging."],
             "Swinging, using momentum.",
             "When 3 × 12 is easy, straighten the legs a little more each week.",
             "Your pull-up bar.", "Captain's chair or pull-up bar.",
             "ATHLEAN-X · CaliMove", yt("Pr1ieGZ5atk", 0, "Hanging leg raise"),
             ev("grip"), no_gear="No bar: lying leg raises on the floor, lower back pressed down, 10–15 reps."),
        lift("Side plank", 2, "30 sec per side", 45,
             "One of the McGill Big 3 for a strong, healthy lower back.",
             "Lie on your side, elbow under the shoulder, knees bent to start.",
             ["Lift the hips so your body is a straight line.", "Breathe normally and hold."],
             "Hips sagging or rolling back.",
             "Knees bent, then straight legs, then 45 seconds.",
             "On the floor.", "On the floor.",
             "McGill Big 3", page("https://fitbod.me/exercises/side-plank-with-knees-bent", "Side plank with knees bent", "Fitbod"),
             ev("acsm")),
        lift("Suitcase carry", 2, "30 m per side", 60,
             "One heavy weight in one hand trains the side core to keep you upright: carrying groceries, luggage, kids.",
             "One heavy kettlebell in one hand.",
             ["Stand perfectly upright, don't lean away.", "Walk with short steps. Switch hands."],
             "Leaning toward or away from the weight.",
             "Add weight when 30 m feels easy.",
             "One kettlebell.", "One heavy dumbbell.",
             "ATHLEAN-X", yt("ixkQaZXVQjs", 452, "Suitcase carry", "ATHLEAN-X"),
             ev("grip")),
    ]


# ---------- Rides ----------
PREP = ["Front and rear lights on (dark until about 6:40).", "Water bottle; add electrolytes if it's hot and humid.",
        "Squeeze the tires and test the brakes.", "Helmet, phone, ID."]

EFFORT = [
    {"zone": "Easy (Zone 2)", "feel": "3–4 out of 10. You can talk in full sentences; you could breathe through your nose.", "use": "Monday and Wednesday, warm-ups, cool-downs."},
    {"zone": "Moderate", "feel": "5–6 out of 10. Sentences get short.", "use": "Only the end of the 4×4 warm-up."},
    {"zone": "Hard", "feel": "8–9 out of 10. A few words at a time, legs burning by the end of each round.", "use": "The 4×4 rounds only."},
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
            "Last 5 min very easy, then the 10-min cool-down below.",
        ],
        "why": "Easy riding builds the heart's base and burns fat without eating into your lifting. Most of your cardio should feel this easy.",
        "evidence": ev("zone2", "vo2"),
        "source": "Zone 2 research (Peter Attia, Huberman)",
        "safety": "6:00 is still dark until about 6:40: front and rear lights on.",
        "prep": PREP, "effort": EFFORT, "cooldown": COOL_RIDE,
        "swap": True,
    }


def four_by_four(w):
    deload = w in (6, 12)
    rounds = 3 if deload else 4
    hard = 2 if w <= 2 else 3 if w <= 5 else 4
    easy = 2 if w <= 2 else 3
    effort = "7–8 out of 10" if w <= 2 else "8–9 out of 10"
    title = "Norwegian 4×4" if hard == 4 else f"4×4 build-up ({rounds}×{hard} min)"
    return {
        "kind": "intervals", "title": title, "minutes": 10 + rounds * (hard + easy) + 5,
        "summary": f"{rounds} rounds of {hard} min hard, {easy} min easy.",
        "how": [
            "10 min warm-up, building from easy to moderate.",
            f"{rounds} rounds: {hard} min hard at {effort} (only a few words at a time), then {easy} min easy spinning.",
            "Then the 10-min cool-down below; keep the easy spin a little longer after hard rounds.",
        ] + (["The hard rounds grow from 2 to 3 to 4 minutes over the first weeks, so you earn the full 4×4 by week 7."] if hard < 4 else []),
        "intervals": {"warm": 10, "rounds": rounds, "hard": hard, "easy": easy},
        "why": "Once a week, this is the best-studied way to raise heart fitness (VO2 max), one of the strongest markers of long life.",
        "evidence": ev("4x4", "vo2"),
        "source": "Norwegian 4×4 (Helgerud et al.)",
        "safety": "Pick a quiet stretch of road with no stop lights for the hard rounds. Lights on in the dark.",
        "prep": PREP, "effort": EFFORT, "cooldown": COOL_RIDE,
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
    "video": yt("bVuSK5RQUhQ", 0, "Kettlebell swing fundamentals"),
    "source": "ATHLEAN-X · CaliMove",
}

MOBILITY = [
    move("Cat-cow", "10 slow reps", "On all fours, round the back up, then let it sink, moving one segment at a time.",
         "Floor.", "Floor or a mat.", "Fitbod", page("https://fitbod.me/exercises/cat-cow", "Cat-cow", "Fitbod")),
    move("90/90 hip switches", "10", "Both knees at 90°, rotate side to side, stay tall.",
         "Floor.", "Floor.", "JR Stretch", yt("fdBakoYR0GU", 203, "90/90 hip switches", "JR Stretch")),
    move("Deep squat rocks", "1 min", "Sink into a deep squat, holding the chair if needed, rock gently side to side.",
         "Floor, chair for support.", "Floor.", "JR Stretch", yt("dWOgSebEAAM", 225, "Deep-squat rocks", "JR Stretch")),
    move("Open book", "6 per side", "Side-lying, open the top arm across, follow it with your eyes.",
         "Floor.", "Floor.", "JR Stretch", yt("fdBakoYR0GU", 146, "Side-lying open book", "JR Stretch")),
    move("Figure-four hip stretch", "30 sec per side", "On your back, ankle over the other knee, pull gently.",
         "Floor.", "Floor.", "Movement by David", yt("eQHmKJh20_c", 285, "Supine figure-four", "Movement by David")),
    move("Dead hang", "30–60 sec total", "Relaxed hang (no bar: heavy kettlebell hold).",
         "Pull-up bar.", "Pull-up bar.", "ATHLEAN-X", why=EV["grip"]["text"]),
    move("McGill Big 3", "3 rounds of short holds", "Curl-up, bird dog, side plank: 8–10 sec holds, a few reps each.",
         "Floor.", "Floor.", "Stuart McGill"),
    move("Single-leg stand and floor get-ups", "1 min + 3 reps", "Balance on each foot, then sit down and stand up with as little hand help as you can.",
         "Floor.", "Floor.", "Peter Attia", why=EV["balance"]["text"]),
    move("Walk in the morning light", "20–30 min", "Outside, easy pace.", "Outside.", "Outside.", "Huberman"),
]

REST = {
    "kind": "rest", "title": "Rest or mobility", "minutes": 15,
    "summary": "Optional 15 min mobility and a walk in the morning light. Rest is fine too.",
    "mobility": MOBILITY,
    "why": "Moving every joint through its full range keeps it that way. Balance and getting up off the floor are two of the simplest predictors of a long, independent life.",
    "evidence": ev("balance", "sitrise"),
    "source": "JR Stretch · CaliMove · Movement by David · McGill · Huberman",
    "swap": False,
}

LIFT_C = {
    "title": "Optional Lift C (Saturday, 30 min)",
    "how": ["3 rounds: 8–12 push-ups, 5–8 chin-ups (no bar: one-arm rows), 10 goblet squats, 15 kettlebell swings. Rest 90 sec between rounds."],
    "note": "Only if you feel fresh. A third lifting day builds muscle faster.",
    "source": "Jeff Nippard (training frequency)",
}

MENTAL = [
    {"name": "Calm · Be Present", "url": "https://www.youtube.com/watch?v=ZToicYcHIOU"},
    {"name": "Priory · Body Scan", "url": "https://www.youtube.com/watch?v=aH72AScs0qk"},
    {"name": "Dr Julie · Mindfulness", "url": "https://www.youtube.com/watch?v=svVDEkBQxpU"},
]

RULES = [
    "Missed a lifting day? Do it the next day and push the rest of the week along. Never two lifting days back to back, never two workouts in one day.",
    "Rain or lightning at ride time: do the kettlebell circuit instead.",
]

# ---------- Longevity habits, picked per day ----------
L = {
    "light": {"name": "Morning light", "dose": "5–10 min outside within an hour of waking", "why": "Sets the body clock for better sleep and morning alertness.", "source": "Huberman"},
    "light_ride": {"name": "Morning light", "dose": "Done by riding outside", "why": "Sets the body clock for better sleep and morning alertness.", "source": "Huberman"},
    "cold": {"name": "No cold shower today", "dose": "Wait about 6 hours after lifting", "why": EV["cold"]["text"] + " Muscle is goal one, so keep cold to ride days, if you like it.", "source": "Huberman · Roberts 2015"},
    "protein": {"name": "Protein", "dose": "About 1.6 g per kg of body weight a day; a good serving with breakfast", "why": EV["protein"]["text"], "source": "Jeff Nippard · Morton 2018"},
    "steps": {"name": "Steps and a walk after meals", "dose": "About 7,000–8,000 steps; 10 min easy walk after the biggest meal", "why": EV["steps"]["text"] + " A short walk after eating also blunts the blood-sugar spike, which matters on a desk day.", "source": "Peter Attia · Paluch 2022"},
    "hang": {"name": "Dead-hang target", "dose": "Build toward 2 minutes total; test once a month", "why": EV["grip"]["text"] + " Peter Attia uses a 2-minute hang as a benchmark.", "source": "Peter Attia"},
    "sleep": {"name": "Sleep basics", "dose": "Same wake time every day, dark and cool room, last caffeine 8–10 hours before bed", "why": "Sleep is when muscle repairs; Huberman and Attia rank it with exercise.", "source": "Huberman · Peter Attia"},
    "sigh": {"name": "Calm breathing", "dose": "1–5 min of physiological sighs, any stressful market moment", "why": EV["sigh"]["text"], "source": "Huberman"},
    "balance": {"name": "Balance and floor get-ups", "dose": "1 min single-leg stands + 3 hands-free get-ups", "why": EV["balance"]["text"], "source": "Peter Attia"},
    "water": {"name": "Water", "dose": "A glass before you train", "why": "You wake up a little dry; it makes the first minutes easier.", "source": "ACSM"},
}
LONGEVITY = {
    "lift": ["light", "cold", "protein", "hang", "sleep"],
    "ride": ["light_ride", "balance", "steps", "sleep", "sigh"],
    "intervals": ["light_ride", "balance", "steps", "sleep", "sigh"],
    "rest": ["light", "steps", "protein", "sleep"],
}


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
                 "why": "Full body twice a week: every muscle gets trained twice, which the research favors for muscle and strength.",
                 "evidence": ev("acsm", "volume"),
                 "warmup": WARMUP, "lifts": lift_a(deload), "cooldown": COOL_LIFT, "swap": False}
        elif name == "Thursday":
            d = {"kind": "lift", "title": "Lift B · full body", "minutes": 60,
                 "summary": "Deadlift · overhead press · row · knee strength · arms · knee raise · side plank · carry",
                 "why": "The second full-body day: different lifts for the same muscles, plus knee and core work for the long run.",
                 "evidence": ev("acsm", "volume"),
                 "warmup": WARMUP, "lifts": lift_b(deload), "cooldown": COOL_LIFT, "swap": False}
        elif name == "Friday":
            d = four_by_four(w)
        else:
            d = dict(REST)
            if name == "Saturday" and not deload:
                d = dict(REST, optional=LIFT_C)
        d = dict(d, date=date.isoformat(), weekday=name)
        d["longevity"] = [L[k] for k in LONGEVITY[d["kind"]]]
        days[name] = d
    for i, d in enumerate(days.values()):
        m = MENTAL[((w - 1) * 7 + i) % len(MENTAL)]
        d["mental"] = dict(m, dose="3–5 min, after the workout or any time today")
    if w == 1:
        days["Tuesday"]["baseline"] = "Week 1 baseline: note your weights for each lift, and at the end do one set of max pull-ups and one max dead hang. Tell Duet the numbers."
    cardio = sum(d["minutes"] for d in days.values() if d["kind"] in ("ride", "intervals"))
    rules = RULES + [f"This week's riding: about {cardio} min. Guidelines ask for at least 150 min of moderate activity a week; walks add to it."]
    return {"week": w, "phase": {"id": phase_id, "name": phase_name, "rule": rule},
            "days": days, "swap": SWAP, "daily": [L["water"]["dose"] + ".", "Protein with breakfast after training."], "rules": rules}


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
            json.dump(week, f, ensure_ascii=False, separators=(",", ":"))
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
