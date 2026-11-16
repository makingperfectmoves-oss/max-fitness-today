import { easternDate, validDate } from './date.mjs';

const $ = id => document.getElementById(id);
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const KIND = { lift: ['Strength', '--lift'], ride: ['Easy ride', '--ride'], intervals: ['Intervals', '--hiit'], rest: ['Recovery', '--rest'] };
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) n.append(k);
  return n;
}

const toUTC = s => new Date(s + 'T12:00:00Z');
const addDays = (s, n) => new Date(toUTC(s).getTime() + n * 864e5).toISOString().slice(0, 10);
const shortDate = s => toUTC(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const mmss = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

export function weekFor(date, start, weeks) {
  const days = Math.floor((toUTC(date) - toUTC(start)) / 864e5);
  const real = days < 0 ? 1 : Math.floor(days / 7) + 1;
  const file = real <= weeks ? real : 7 + ((real - weeks - 1) % 6);
  const dayIndex = ((days % 7) + 7) % 7;
  return { real, file, dayIndex, before: days < 0 };
}

let meta, loc = store.get('loc', 'home'), timerId, current;
const cache = {};

async function loadWeek(n) {
  if (!cache[n]) {
    const r = await fetch(`./weeks/week-${String(n).padStart(2, '0')}.json`);
    if (!r.ok) throw new Error('week unavailable');
    cache[n] = await r.json();
  }
  return cache[n];
}

function startTimer(seconds) {
  clearInterval(timerId);
  const t = $('timer');
  let left = seconds;
  const show = () => { t.textContent = `Rest ${mmss(left)} · tap to stop`; };
  t.classList.add('on'); show();
  timerId = setInterval(() => {
    left -= 1;
    if (left <= 0) { clearInterval(timerId); t.textContent = 'Rest done · next set'; if (navigator.vibrate) navigator.vibrate([200, 100, 200]); setTimeout(() => t.classList.remove('on'), 4000); return; }
    show();
  }, 1000);
}

/* ---------- Videos: thumbnail first, the player loads only on tap ---------- */
const ytWatch = v => `https://www.youtube.com/watch?v=${v.yt}${v.t ? `&t=${v.t}s` : ''}`;
function player(v) {
  return el('iframe', { class: 'frame', src: `https://www.youtube-nocookie.com/embed/${v.yt}?start=${v.t || 0}&autoplay=1&rel=0&playsinline=1`,
    title: v.title, allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: '' });
}
function media(v) {
  if (!v) return null;
  if (!v.yt) return el('a', { class: 'guide', href: v.url, target: '_blank', rel: 'noopener' },
    el('div', {}, el('b', {}, v.title), el('span', {}, `${v.by} · step-by-step guide ↗`)));
  const box = el('div', {});
  const img = el('img', { src: `https://i.ytimg.com/vi/${v.yt}/mqdefault.jpg`, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.remove());
  const btn = el('button', { type: 'button', class: 'video', 'aria-label': `Play video: ${v.title}` }, img, el('span', { class: 'play' }),
    el('span', { class: 'cap' }, el('b', {}, v.title), [v.by, v.t ? `starts at ${mmss(v.t)}` : 'from the start'].filter(Boolean).join(' · ')));
  btn.addEventListener('click', () => btn.replaceWith(player(v)));
  box.append(btn, el('div', { class: 'vlinks' }, el('span', {}), el('a', { href: ytWatch(v), target: '_blank', rel: 'noopener' }, 'Open in YouTube ↗')));
  return box;
}
function miniMedia(v) {
  if (!v) return null;
  if (!v.yt) return el('a', { class: 'mini-vid', href: v.url, target: '_blank', rel: 'noopener', style: 'display:inline-block;text-decoration:none' }, `📖 ${v.by} guide`);
  const wrap = el('div', {});
  const b = el('button', { type: 'button', class: 'mini-vid' }, `▶ Watch${v.t ? ` (from ${mmss(v.t)})` : ''}${v.by ? ` · ${v.by}` : ''}`);
  b.addEventListener('click', () => { b.replaceWith(player(v), el('div', { class: 'vlinks' }, el('span', {}, v.title), el('a', { href: ytWatch(v), target: '_blank', rel: 'noopener' }, 'YouTube ↗'))); });
  wrap.append(b);
  return wrap;
}
const evidence = list => (list || []).map(e => el('p', { class: 'ev' }, e.text, e.url ? [' ', el('a', { href: e.url, target: '_blank', rel: 'noopener' }, 'Source ↗')] : null));

/* ---------- Progress ---------- */
function updateProgress() {
  const all = document.querySelectorAll('#main .set, #main .tick');
  const on = [...all].filter(b => b.getAttribute('aria-pressed') === 'true').length;
  const bar = document.querySelector('.bar span');
  if (bar) bar.style.width = all.length ? `${Math.round(on / all.length * 100)}%` : '0';
  const lbl = document.querySelector('.barlbl');
  if (lbl) lbl.textContent = on ? `${on} of ${all.length} steps done` : `${all.length} steps · tick them off as you go`;
}

function toggle(key, label, onOn, cls = 'tick', text = '') {
  const b = el('button', { type: 'button', class: cls, 'aria-pressed': store.get(key, 'false'), 'aria-label': label }, text);
  b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on)); store.set(key, String(on));
    if (on && onOn) onOn();
    updateProgress();
  });
  return b;
}

/* ---------- Pieces ---------- */
function moveItem(x, key) {
  const where = x.home ? (loc === 'gym' ? x.gym : x.home) : '';
  return el('div', { class: 'item' },
    toggle(key, `${x.name} done`),
    el('div', {},
      el('div', {}, el('span', { class: 'nm' }, x.name), el('span', { class: 'ds' }, ` · ${x.dose}`)),
      el('p', {}, x.cue),
      where && where !== 'Floor.' ? el('p', { class: 'ds' }, where) : null,
      x.why ? el('p', { class: 'ds' }, x.why) : null,
      miniMedia(x.video)));
}

function sectionHead(n, title, time) {
  return el('h3', {}, el('span', { class: 'n' }, String(n)), title, time ? el('span', { class: 't' }, time) : null);
}

function exercise(ex, i, date) {
  const gym = loc === 'gym';
  const label = g => g ? 'Gym' : 'Home';
  const vidFor = g => (g && ex.gymVideo) ? ex.gymVideo : ex.video;
  let showingOther = false;
  const v = el('div', { class: 'variant' });
  const vid = el('div', {});
  const paint = () => {
    const g = gym !== showingOther;
    v.replaceChildren(el('span', { class: 'tag' }, label(g)), g ? ex.gym : ex.home);
    vid.replaceChildren(media(vidFor(g)));
  };
  paint();
  const otherBtn = el('button', { type: 'button', class: 'mini' }, gym ? 'Show home version' : 'Show gym version');
  otherBtn.addEventListener('click', () => {
    showingOther = !showingOther; paint();
    otherBtn.textContent = showingOther ? 'Back' : (gym ? 'Show home version' : 'Show gym version');
  });
  const wkey = `wt:${ex.name}`;
  const wt = el('input', { class: 'wt', type: 'text', inputmode: 'decimal', placeholder: 'Weight', 'aria-label': `${ex.name} weight`, value: store.get(wkey, '') });
  wt.addEventListener('change', () => store.set(wkey, wt.value.trim()));
  const sets = el('div', { class: 'row' });
  for (let s = 1; s <= ex.sets; s++) sets.append(toggle(`set:${date}:${i}:${s}`, `${ex.name} set ${s} done`, () => ex.rest && startTimer(ex.rest), 'set', String(s)));
  sets.append(wt);

  const how = el('details', { class: 'how' }, el('summary', {}, 'How to do it'),
    el('dl', {},
      el('dt', {}, 'Set up'), el('dd', {}, ex.setup),
      el('dt', {}, 'Move'), el('dd', {}, el('ol', { class: 'steps' }, ex.steps.map(s => el('li', {}, s)))),
      el('dt', {}, 'Avoid'), el('dd', {}, ex.avoid)));
  const more = el('details', { class: 'how' }, el('summary', {}, 'How to progress · the evidence'),
    el('dl', {}, el('dt', {}, 'Progress'), el('dd', {}, ex.progress), el('dt', {}, 'Evidence'), el('dd', {}, evidence(ex.evidence)),
      ex.limits ? [el('dt', {}, 'Limits'), el('dd', {}, ex.limits)] : null),
    el('p', { class: 'src' }, `Coaching: ${ex.source} · `, el('a', { href: ex.demo, target: '_blank', rel: 'noopener' }, 'more videos ↗')));

  return el('div', { class: 'ex' },
    el('div', { class: 'ex-head' }, el('span', { class: 'ex-name' }, `${i + 1}. ${ex.name}`), el('span', { class: 'dose' }, `${ex.sets} × ${ex.reps}`)),
    el('p', { class: 'exmeta' }, `Rest ${ex.rest >= 120 ? ex.rest / 60 + ' min' : ex.rest + ' sec'} · timer starts when you tick a set`),
    vid, v,
    ex.noGear ? el('p', { class: 'nogear' }, ex.noGear) : null,
    el('p', { class: 'why' }, ex.why),
    how, more,
    el('div', { class: 'row' }, otherBtn),
    sets);
}

function warmup(day, n) {
  const total = day.warmup.reduce((a, p) => a + p.minutes, 0);
  return el('section', {}, sectionHead(n, 'Warm-up', `${total} min`),
    el('p', { class: 'goal' }, 'Raise temperature, armor the joints, rehearse the patterns, ramp the load.'),
    day.warmup.map((p, pi) => [el('h4', {}, `${p.part} `, el('small', {}, `· ${p.minutes} min · ${p.goal}`)),
      p.items.map((x, xi) => moveItem(x, `wu:${day.date}:${pi}:${xi}`))]));
}

function cooldown(day, n) {
  const c = day.cooldown;
  return el('section', {}, sectionHead(n, 'Cool-down', `${c.minutes} min`),
    el('p', { class: 'goal' }, c.goal),
    c.items.map((x, xi) => moveItem(x, `cd:${day.date}:${xi}`)),
    el('details', {}, el('summary', {}, 'Why a cool-down'), evidence([{ text: 'A cool-down does little for next-day soreness. It does settle the heart rate after hard work, it is the best moment for mobility while the muscles are warm, and the breathing turns a hard session into a calm start to the trading day.' }])));
}

function longevity(day, week, n) {
  return el('section', {}, sectionHead(n, 'For a long life, today'),
    el('p', { class: 'goal' }, 'Small habits from Huberman, Peter Attia and the research behind them. No gear needed.'),
    day.longevity.map(h => el('div', { class: 'habit' }, el('div', { class: 'nm' }, h.name), el('div', { class: 'ds' }, h.dose),
      el('details', {}, el('summary', {}, 'Why'), el('p', { class: 'wy' }, h.why), el('p', { class: 'src' }, h.source)))),
    day.mental ? el('div', { class: 'habit' }, el('div', { class: 'nm' }, 'Mind'),
      el('div', { class: 'ds' }, el('a', { href: day.mental.url, target: '_blank', rel: 'noopener' }, day.mental.name), ` · ${day.mental.dose}`)) : null,
    el('details', {}, el('summary', {}, 'Week rules'), el('ul', { class: 'steps' }, (week.rules || []).map(x => el('li', {}, x)))));
}

function logText(day) {
  const d = `${day.weekday.slice(0, 3)} ${shortDate(day.date)}`;
  if (day.kind !== 'lift') {
    const tick = document.querySelectorAll('#main .tick[aria-pressed="true"]').length;
    return `Done: ${day.title}, ${d}${day.kind === 'rest' ? '' : `, ${day.minutes} min`}.${tick ? ` Cool-down/mobility: ${tick} ticked.` : ''}`;
  }
  const parts = day.lifts.map((ex, i) => {
    const done = [...Array(ex.sets)].filter((_, s) => store.get(`set:${day.date}:${i}:${s + 1}`, 'false') === 'true').length;
    const w = store.get(`wt:${ex.name}`, '');
    return `${ex.name}${w ? ' ' + w : ''}: ${done}/${ex.sets} sets`;
  });
  return `Done: ${day.title} (${loc}), ${d}. ${parts.join('; ')}.`;
}

function logBox(day, n) {
  const ta = el('textarea', { class: 'log', readonly: '', 'aria-label': 'Text for Duet' });
  const btn = el('button', { type: 'button', class: 'primary' }, 'Copy for Duet');
  btn.addEventListener('click', async () => {
    ta.value = logText(day);
    try { await navigator.clipboard.writeText(ta.value); btn.textContent = 'Copied · paste it to Duet'; }
    catch { ta.select(); btn.textContent = 'Select and copy the text below'; }
    setTimeout(() => { btn.textContent = 'Copy for Duet'; }, 4000);
  });
  return el('section', {}, sectionHead(n, 'Tell Duet'),
    el('p', { class: 'goal' }, 'Tap to copy a one-line summary of your ticks and weights, then paste it to Duet. Or just say "done", "skip", or your numbers.'),
    btn, ta);
}

/* ---------- Ride weather (weather.gov, US only, no key) ---------- */
async function weather(box, ask) {
  const saved = store.get('geo', '');
  let lat, lon;
  if (saved) [lat, lon] = saved.split(',');
  else if (ask) {
    box.textContent = 'Finding your location…';
    try {
      const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 }));
      lat = p.coords.latitude.toFixed(2); lon = p.coords.longitude.toFixed(2); store.set('geo', `${lat},${lon}`);
    } catch { box.textContent = 'Location was not shared. Check weather.gov or your weather app.'; return; }
  } else return;
  box.textContent = 'Checking the forecast…';
  try {
    const pt = await (await fetch(`https://api.weather.gov/points/${lat},${lon}`)).json();
    const fc = await (await fetch(pt.properties.forecastHourly)).json();
    const now = Date.now();
    const next = fc.properties.periods.filter(p => new Date(p.endTime) > now).slice(0, 3);
    const rain = Math.max(...next.map(p => p.probabilityOfPrecipitation?.value || 0));
    const storm = next.some(p => /thunder|lightning/i.test(p.shortForecast));
    const verdict = storm ? 'Storms nearby: do the kettlebell circuit.' : rain >= 60 ? 'Rain likely: do the kettlebell circuit.' : rain >= 30 ? 'Some chance of rain: check the radar before you go.' : 'Good to ride.';
    const p0 = next[0];
    box.replaceChildren(el('b', {}, verdict), `Next 3 hours: ${p0.temperature}°${p0.temperatureUnit}, ${p0.shortForecast.toLowerCase()}, rain up to ${rain}%, wind ${p0.windSpeed}.`);
  } catch { box.textContent = 'The forecast did not load. Check your weather app.'; }
}

function ridePrep(day, n, isToday) {
  const box = el('div', { class: 'wx' }, isToday ? 'Tap to check the next 3 hours at your location.' : 'The weather check works on the day itself.');
  const btn = el('button', { type: 'button', class: 'mini' }, '☁ Check ride weather');
  btn.addEventListener('click', () => weather(box, true));
  if (isToday && store.get('geo', '')) weather(box, false);
  return el('section', {}, sectionHead(n, 'Before you ride', '2 min'),
    day.prep.map((x, xi) => el('div', { class: 'item' }, toggle(`prep:${day.date}:${xi}`, x), el('div', {}, x))),
    el('div', { class: 'row' }, btn), box);
}

function rideMain(day, week, n) {
  const sec = el('section', {}, sectionHead(n, day.kind === 'intervals' ? 'The intervals' : 'The ride', `${day.minutes} min`),
    el('ol', { class: 'steps' }, day.how.map(x => el('li', {}, x))));
  if (day.intervals) {
    const iv = day.intervals, total = iv.warm + iv.rounds * (iv.hard + iv.easy);
    const blocks = [{ m: iv.warm, k: '--ride', t: 'Warm-up' }];
    for (let r = 0; r < iv.rounds; r++) blocks.push({ m: iv.hard, k: '--hiit', t: `Hard ${r + 1}` }, { m: iv.easy, k: '--ride', t: 'Easy' });
    sec.append(el('div', { style: 'display:flex;gap:2px;margin:12px 0 4px;height:34px;align-items:flex-end' },
      blocks.map(b => el('div', { title: `${b.t} ${b.m} min`, style: `flex:${b.m};background:var(${b.k});border-radius:4px;height:${b.k === '--hiit' ? 34 : 14}px` }))),
      el('p', { class: 'src' }, `Shape of the ride: ${total} min of warm-up and rounds, then the easy spin and cool-down. Tall blocks are the hard rounds.`));
  }
  sec.append(el('h4', {}, 'How hard is hard?'),
    el('table', { class: 'effort' }, el('tbody', {}, day.effort.map(e => el('tr', {}, el('td', {}, e.zone), el('td', {}, e.feel, el('br'), el('span', { class: 'src' }, e.use)))))));
  sec.append(el('details', {}, el('summary', {}, week.swap.title),
    media(week.swap.video),
    el('ol', { class: 'steps' }, week.swap.how.map(x => el('li', {}, x))), el('p', { class: 'note' }, week.swap.note), el('p', { class: 'src' }, 'Coaching: ' + week.swap.source)));
  return sec;
}

function restMain(day, n) {
  const sec = el('section', {}, sectionHead(n, 'Mobility flow', `${day.minutes} min + walk`),
    el('p', { class: 'goal' }, 'Optional. Every joint through its full range, plus balance and getting up off the floor.'),
    day.mobility.map((x, xi) => moveItem(x, `mob:${day.date}:${xi}`)));
  if (day.optional) sec.append(el('details', {}, el('summary', {}, day.optional.title),
    el('ol', { class: 'steps' }, day.optional.how.map(x => el('li', {}, x))), el('p', { class: 'note' }, day.optional.note), el('p', { class: 'src' }, 'Source: ' + day.optional.source)));
  return sec;
}

function hero(day, week) {
  const [kname, kvar] = KIND[day.kind];
  return el('section', { class: 'hero' },
    el('div', { class: 'chips' }, el('span', { class: 'chip k' }, kname), el('span', { class: 'chip' }, `About ${day.minutes} min`),
      day.kind === 'lift' ? el('span', { class: 'chip' }, loc === 'gym' ? 'Gym' : 'Home: floor, chair, your weights') : null),
    el('h2', {}, day.title),
    el('p', { class: 'meta' }, day.summary),
    day.why ? el('p', { class: 'why' }, day.why) : null,
    day.evidence ? el('details', {}, el('summary', {}, 'The evidence'), evidence(day.evidence), el('p', { class: 'src' }, 'Coaching: ' + day.source || '')) : null,
    day.safety ? el('p', { class: 'safety' }, day.safety) : null,
    day.baseline ? el('p', { class: 'safety' }, day.baseline) : null,
    el('div', { class: 'bar' }, el('span', {})), el('div', { class: 'barlbl' }),
    el('div', { class: 'phase' }, el('b', {}, `Week rule · ${week.phase.name}`), week.phase.rule));
}

function renderDay(week, day, isToday) {
  const main = $('main');
  main.style.setProperty('--k', `var(${KIND[day.kind][1]})`);
  const parts = [hero(day, week)];
  let n = 1;
  if (day.kind === 'lift') {
    parts.push(warmup(day, n++));
    parts.push(el('section', {}, sectionHead(n++, 'Main lifts', 'about 40 min'),
      el('p', { class: 'goal' }, 'Tick a set to start the rest timer. Your weight is remembered for next time.'),
      day.lifts.map((ex, i) => exercise(ex, i, day.date))));
    parts.push(cooldown(day, n++));
  } else if (day.kind === 'rest') {
    parts.push(restMain(day, n++));
  } else {
    parts.push(ridePrep(day, n++, isToday));
    parts.push(rideMain(day, week, n++));
    parts.push(cooldown(day, n++));
  }
  parts.push(longevity(day, week, n++));
  parts.push(logBox(day, n++));
  main.replaceChildren(...parts);
  updateProgress();
}

async function render(date) {
  const w = weekFor(date, meta.startDate, meta.weeks);
  const week = await loadWeek(w.file);
  const dayName = DAY_NAMES[w.dayIndex];
  const day = week.days[dayName];
  const today = easternDate();
  current = date;
  $('kicker').textContent = `Week ${w.real} · ${week.phase.name}${w.before ? ' · starts Nov 16' : ''}`;
  $('title').textContent = date === today ? `Today: ${day.title}` : `${dayName}: ${day.title}`;
  $('sub').textContent = `${dayName}, ${shortDate(date)}`;
  const monday = addDays(date, -w.dayIndex);
  $('days').replaceChildren(...DAY_NAMES.map((nm, i) => {
    const d = addDays(monday, i);
    const k = KIND[week.days[nm].kind][1];
    const b = el('button', { type: 'button', 'aria-pressed': String(d === date), class: d === today ? 'today' : '', 'aria-label': `${nm} ${shortDate(d)}: ${week.days[nm].title}` },
      nm.slice(0, 3), el('b', {}, String(toUTC(d).getUTCDate())), el('i', { style: `--k:var(${k})` }));
    b.addEventListener('click', () => go(d));
    return b;
  }));
  $('date').value = date;
  renderDay(week, day, date === today);
}

function go(date) {
  const url = new URL(location.href);
  if (date === easternDate()) url.searchParams.delete('date'); else url.searchParams.set('date', date);
  history.replaceState(null, '', url);
  render(date).catch(fail);
  window.scrollTo(0, 0);
}

function setLoc(v) {
  loc = v; store.set('loc', v);
  $('loc-home').setAttribute('aria-pressed', String(v === 'home'));
  $('loc-gym').setAttribute('aria-pressed', String(v === 'gym'));
}

function fail() { $('main').replaceChildren(el('section', {}, el('p', {}, 'The workout could not load. Pull to refresh.'))); }

async function start() {
  const r = await fetch('./program.json');
  if (!r.ok) throw new Error('program unavailable');
  meta = await r.json();
  $('version').textContent = 'Program ' + meta.version;
  setLoc(loc);
  $('loc-home').addEventListener('click', () => { setLoc('home'); render(current).catch(fail); });
  $('loc-gym').addEventListener('click', () => { setLoc('gym'); render(current).catch(fail); });
  $('date').addEventListener('change', e => { if (validDate(e.target.value)) go(e.target.value); });
  $('timer').addEventListener('click', () => { clearInterval(timerId); $('timer').classList.remove('on'); });
  const q = new URLSearchParams(location.search).get('date');
  await render(validDate(q) ? q : easternDate());
}

start().catch(fail);
