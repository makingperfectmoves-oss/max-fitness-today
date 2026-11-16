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
const hm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

export function weekFor(date, start, weeks) {
  const days = Math.floor((toUTC(date) - toUTC(start)) / 864e5);
  const real = days < 0 ? 1 : Math.floor(days / 7) + 1;
  const file = real <= weeks ? real : 7 + ((real - weeks - 1) % 6);
  const dayIndex = ((days % 7) + 7) % 7;
  return { real, file, dayIndex, before: days < 0 };
}

let meta, loc = store.get('loc', 'home'), view = 'today', timerId, current, currentWeek, currentDay;
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

/* ---------- Video: thumbnail first, player only on tap ---------- */
const ytWatch = v => `https://www.youtube.com/watch?v=${v.yt}${v.t ? `&t=${v.t}s` : ''}`;
const player = v => el('iframe', { class: 'frame', src: `https://www.youtube-nocookie.com/embed/${v.yt}?start=${v.t || 0}&autoplay=1&rel=0&playsinline=1`,
  title: v.title, allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: '' });
function media(v) {
  if (!v) return null;
  if (!v.yt) return el('a', { class: 'guide', href: v.url, target: '_blank', rel: 'noopener' }, el('i', {}, 'Aa'),
    el('div', {}, el('b', {}, v.title), el('span', {}, `${v.by} · step-by-step guide`)));
  const img = el('img', { src: `https://i.ytimg.com/vi/${v.yt}/mqdefault.jpg`, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.remove());
  const btn = el('button', { type: 'button', class: 'video', 'aria-label': `Play video: ${v.title}` }, img, el('span', { class: 'pl' }),
    el('span', { class: 'cap' }, el('b', {}, v.title), [v.by, v.t ? `jumps to ${mmss(v.t)}` : ''].filter(Boolean).join(' · ')));
  btn.addEventListener('click', () => btn.replaceWith(player(v)));
  return el('div', {}, btn, el('div', { class: 'vlink' }, el('a', { href: ytWatch(v), target: '_blank', rel: 'noopener' }, 'Open in YouTube')));
}
function miniMedia(v) {
  if (!v) return null;
  if (!v.yt) return el('a', { class: 'chipbtn', href: v.url, target: '_blank', rel: 'noopener' }, `${v.by} guide`);
  const b = el('button', { type: 'button', class: 'chipbtn' }, `Watch${v.t ? ` from ${mmss(v.t)}` : ''}${v.by ? ` · ${v.by}` : ''}`);
  b.addEventListener('click', () => b.replaceWith(player(v)));
  return b;
}
const evidence = list => (list || []).map(e => el('p', { class: 'ev' }, e.text, e.url ? [' ', el('a', { href: e.url, target: '_blank', rel: 'noopener' }, 'Source')] : null));

/* ---------- Progress ---------- */
function updateProgress() {
  const all = [...document.querySelectorAll('#main [data-step]')];
  const on = all.filter(b => b.getAttribute('aria-pressed') === 'true').length;
  const pct = all.length ? Math.round(on / all.length * 100) : 0;
  document.querySelector('#ring .fg').style.strokeDashoffset = String(213.6 * (1 - pct / 100));
  $('pct').textContent = `${pct}%`;
  document.querySelectorAll('#main .node').forEach(n => {
    const s = [...n.querySelectorAll('[data-step]')];
    n.classList.toggle('done', s.length > 0 && s.every(b => b.getAttribute('aria-pressed') === 'true'));
    const c = n.querySelector('.cnt');
    if (c && s.length) c.textContent = `${s.filter(b => b.getAttribute('aria-pressed') === 'true').length}/${s.length}`;
  });
}
function toggle(key, label, onOn, cls = 'chk', text = '') {
  const b = el('button', { type: 'button', class: cls, 'data-step': '', 'aria-pressed': store.get(key, 'false'), 'aria-label': label }, text);
  b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on)); store.set(key, String(on));
    if (on && onOn) onOn();
    updateProgress();
  });
  return b;
}

/* ---------- Building blocks ---------- */
function node(n, clock, title, kids, open = true) {
  return el('div', { class: 'node' }, el('span', { class: 'dot', 'aria-hidden': 'true' }, String(n)),
    clock ? el('div', { class: 'clock' }, clock) : null,
    el('details', Object.assign({ class: 'block' }, open ? { open: '' } : {}), el('summary', {}, el('h2', {}, title), el('span', { class: 'cnt' })),
      el('div', { class: 'body' }, kids)));
}
function moveRow(x, key) {
  const where = x.home ? (loc === 'gym' ? x.gym : x.home) : '';
  return el('div', { class: 'row' }, toggle(key, `${x.name} done`),
    el('div', {}, el('div', {}, el('span', { class: 'nm' }, x.name), el('span', { class: 'ds' }, `  ${x.dose}`)),
      el('p', {}, x.cue),
      where && where !== 'Floor.' ? el('p', { class: 'ds' }, where) : null,
      x.why ? el('p', { class: 'why-s' }, x.why) : null,
      miniMedia(x.video)));
}

function liftTile(ex, i, date) {
  const gym = loc === 'gym';
  let other = false;
  const where = el('div', { class: 'where' });
  const vid = el('div', {});
  const swap = el('button', { type: 'button', class: 'swap' });
  const paint = () => {
    const g = gym !== other;
    where.replaceChildren(el('span', { class: 'lab' }, g ? 'Gym' : 'Home'), el('span', {}, g ? ex.gym : ex.home));
    vid.replaceChildren(media(g && ex.gymVideo ? ex.gymVideo : ex.video));
    swap.textContent = other ? 'Back' : (gym ? 'See the home version' : 'See the gym version');
  };
  swap.addEventListener('click', () => { other = !other; paint(); });
  paint();
  const wkey = `wt:${ex.name}`;
  const wt = el('input', { class: 'wt', type: 'text', inputmode: 'decimal', placeholder: 'Weight', 'aria-label': `${ex.name} weight`, value: store.get(wkey, '') });
  wt.addEventListener('change', () => store.set(wkey, wt.value.trim()));
  const sets = el('div', { class: 'sets' });
  for (let s = 1; s <= ex.sets; s++) sets.append(toggle(`set:${date}:${i}:${s}`, `${ex.name} set ${s} done`, () => ex.rest && startTimer(ex.rest), 'set', String(s)));
  sets.append(wt);
  return el('div', { class: 'lift' },
    el('div', { class: 'lh' }, el('span', { class: 'num' }, String(i + 1).padStart(2, '0')), el('h3', {}, ex.name), el('span', { class: 'dose' }, `${ex.sets}×${ex.reps}`)),
    el('div', { class: 'lmeta' }, `Rest ${ex.rest >= 120 ? ex.rest / 60 + ' min' : ex.rest + ' sec'} · ticking a set starts the timer · ${ex.source}`),
    vid, where, swap,
    ex.noGear ? el('p', { class: 'nogear' }, ex.noGear) : null,
    el('p', { class: 'why' }, ex.why),
    sets,
    el('details', { class: 'more' }, el('summary', {}, 'How to do it'),
      el('dl', {}, el('dt', {}, 'Set up'), el('dd', {}, ex.setup), el('dt', {}, 'Move'), el('dd', {}, el('ol', {}, ex.steps.map(s => el('li', {}, s)))),
        el('dt', {}, 'Avoid'), el('dd', {}, ex.avoid))),
    el('details', { class: 'more' }, el('summary', {}, 'Progress and evidence'),
      el('dl', {}, el('dt', {}, 'Progress'), el('dd', {}, ex.progress), el('dt', {}, 'Evidence'), el('dd', {}, evidence(ex.evidence)),
        ex.limits ? [el('dt', {}, 'Limits'), el('dd', {}, ex.limits)] : null),
      el('p', { class: 'src' }, el('a', { href: ex.demo, target: '_blank', rel: 'noopener' }, `More ${ex.source.split(' · ')[0]} videos`))));
}

function stretchNode(n, day, open) {
  return node(n, 'ANY TIME TODAY · 10 MIN', 'Longevity stretch', [
    el('p', { class: 'lead' }, 'The short list every movement coach agrees on: hips, hamstrings, ankles, upper back, shoulders, balance. Evening works well.'),
    meta.stretch.map((x, i) => moveRow(x, `st:${day.date}:${i}`))], open);
}

function coolNode(n, clock, day) {
  const c = day.cooldown;
  return node(n, clock, `Cool-down · ${c.minutes} min`, [el('p', { class: 'lead' }, c.goal), c.items.map((x, i) => moveRow(x, `cd:${day.date}:${i}`))]);
}

function logText(day) {
  const d = `${day.weekday.slice(0, 3)} ${shortDate(day.date)}`;
  if (day.kind !== 'lift') return `Done: ${day.title}, ${d}${day.kind === 'rest' ? '' : `, ${day.minutes} min`}.`;
  const parts = day.lifts.map((ex, i) => {
    const done = [...Array(ex.sets)].filter((_, s) => store.get(`set:${day.date}:${i}:${s + 1}`, 'false') === 'true').length;
    const w = store.get(`wt:${ex.name}`, '');
    return `${ex.name}${w ? ' ' + w : ''}: ${done}/${ex.sets} sets`;
  });
  return `Done: ${day.title} (${loc}), ${d}. ${parts.join('; ')}.`;
}
function logNode(n, day) {
  const ta = el('textarea', { class: 'log', readonly: '', 'aria-label': 'Text for Duet' });
  const btn = el('button', { type: 'button', class: 'btn full' }, 'Copy my summary for Duet');
  btn.addEventListener('click', async () => {
    ta.value = logText(day);
    try { await navigator.clipboard.writeText(ta.value); btn.textContent = 'Copied. Paste it to Duet'; }
    catch { ta.select(); btn.textContent = 'Select and copy the text below'; }
    setTimeout(() => { btn.textContent = 'Copy my summary for Duet'; }, 4000);
  });
  return node(n, 'DONE', 'Tell Duet', [el('p', { class: 'lead' }, 'One tap copies your ticks and weights. Or just say "done", "skip", or your numbers.'), btn, ta]);
}

async function weather(box, ask) {
  const saved = store.get('geo', '');
  let lat, lon;
  if (saved) [lat, lon] = saved.split(',');
  else if (ask) {
    box.textContent = 'Finding your location…';
    try {
      const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 }));
      lat = p.coords.latitude.toFixed(2); lon = p.coords.longitude.toFixed(2); store.set('geo', `${lat},${lon}`);
    } catch { box.textContent = 'Location was not shared. Check your weather app.'; return; }
  } else return;
  box.textContent = 'Checking the forecast…';
  try {
    const pt = await (await fetch(`https://api.weather.gov/points/${lat},${lon}`)).json();
    const fc = await (await fetch(pt.properties.forecastHourly)).json();
    const next = fc.properties.periods.filter(p => new Date(p.endTime) > Date.now()).slice(0, 3);
    const rain = Math.max(...next.map(p => p.probabilityOfPrecipitation?.value || 0));
    const storm = next.some(p => /thunder|lightning/i.test(p.shortForecast));
    const verdict = storm ? 'Storms nearby: do the kettlebell circuit.' : rain >= 60 ? 'Rain likely: do the kettlebell circuit.' : rain >= 30 ? 'Some chance of rain: check the radar first.' : 'Good to ride.';
    const p0 = next[0];
    box.replaceChildren(el('b', {}, verdict), `Next 3 hours: ${p0.temperature}°${p0.temperatureUnit}, ${p0.shortForecast.toLowerCase()}, rain up to ${rain}%, wind ${p0.windSpeed}.`);
  } catch { box.textContent = 'The forecast did not load. Check your weather app.'; }
}

/* ---------- Views ---------- */
function brief(day, week) {
  return el('section', { class: 'brief' },
    el('div', { class: 'tags' }, el('span', { class: 'tag k' }, KIND[day.kind][0]), el('span', { class: 'tag' }, `About ${day.minutes} min`),
      day.kind === 'lift' ? el('span', { class: 'tag' }, loc === 'gym' ? 'Gym' : 'Home · floor, chair, your weights') : null),
    el('p', { class: 'disp', style: 'font-size:1.05rem;font-weight:600' }, day.summary),
    day.why ? el('p', {}, day.why) : null,
    day.evidence ? el('details', { class: 'more' }, el('summary', {}, 'The evidence'), evidence(day.evidence)) : null,
    day.safety ? el('div', { class: 'callout' }, day.safety) : null,
    day.baseline ? el('div', { class: 'callout' }, day.baseline) : null,
    el('div', { class: 'rule' }, el('b', {}, `This week · ${week.phase.name}. `), week.phase.rule));
}

function todayView(week, day, isToday) {
  const parts = [brief(day, week)];
  const tl = el('div', { class: 'tl' });
  let n = 1;
  if (day.kind === 'lift') {
    const wu = day.warmup.reduce((a, p) => a + p.minutes, 0);
    tl.append(node(n++, '0:00', `Warm-up · ${wu} min`, [el('p', { class: 'lead' }, 'Get warm, armor the joints, rehearse the moves, then two lighter sets of the first lift.'),
      day.warmup.map((p, pi) => [el('div', { class: 'part' }, p.part, el('small', {}, `  ${p.minutes} min · ${p.goal}`)), p.items.map((x, xi) => moveRow(x, `wu:${day.date}:${pi}:${xi}`))])]));
    tl.append(node(n++, hm(wu), 'Main lifts · about 40 min', day.lifts.map((ex, i) => liftTile(ex, i, day.date))));
    tl.append(coolNode(n++, hm(wu + 40), day));
  } else if (day.kind === 'rest') {
    tl.append(node(n++, 'MORNING · OPTIONAL', 'Mobility and a walk', [el('p', { class: 'lead' }, day.why), day.mobility.map((x, i) => moveRow(x, `mob:${day.date}:${i}`)),
      day.optional ? el('details', { class: 'more' }, el('summary', {}, day.optional.title), el('ol', { class: 'plain' }, day.optional.how.map(x => el('li', {}, x))), el('p', { class: 'src' }, day.optional.note)) : null]));
  } else {
    const box = el('div', { class: 'wx' }, isToday ? 'Tap to check the next 3 hours where you are.' : 'The weather check works on the day itself.');
    const wbtn = el('button', { type: 'button', class: 'btn ghost' }, 'Check ride weather');
    wbtn.addEventListener('click', () => weather(box, true));
    if (isToday && store.get('geo', '')) weather(box, false);
    tl.append(node(n++, 'BEFORE YOU GO', 'Ride prep', [day.prep.map((x, i) => el('div', { class: 'row' }, toggle(`prep:${day.date}:${i}`, x), el('div', {}, x))), wbtn, box]));
    const ride = [el('ol', { class: 'plain' }, day.how.map(x => el('li', {}, x)))];
    if (day.intervals) {
      const iv = day.intervals, blocks = [{ m: iv.warm, k: '--ride' }];
      for (let r = 0; r < iv.rounds; r++) blocks.push({ m: iv.hard, k: '--hiit' }, { m: iv.easy, k: '--ride' });
      ride.push(el('div', { class: 'shape', 'aria-hidden': 'true' }, blocks.map(b => el('div', { style: `flex:${b.m};background:var(${b.k});height:${b.k === '--hiit' ? 40 : 16}px` }))),
        el('p', { class: 'src' }, 'The shape of the ride: tall blocks are the hard rounds.'));
    }
    ride.push(el('table', { class: 'eff' }, el('tbody', {}, day.effort.map(e => el('tr', {}, el('td', {}, e.zone), el('td', {}, e.feel, el('br'), el('span', { class: 'src' }, e.use)))))),
      el('details', { class: 'more' }, el('summary', {}, week.swap.title), media(week.swap.video), el('ol', { class: 'plain' }, week.swap.how.map(x => el('li', {}, x))), el('p', { class: 'src' }, week.swap.note)));
    tl.append(node(n++, '0:00', `${day.title} · ${day.minutes} min`, ride));
    tl.append(coolNode(n++, hm(day.minutes), day));
  }
  tl.append(stretchNode(n++, day, day.kind === 'rest'));
  tl.append(logNode(n++, day));
  parts.push(tl);
  return parts;
}

function weekView(week, date) {
  const w = weekFor(date, meta.startDate, meta.weeks);
  const monday = addDays(date, -w.dayIndex);
  const today = easternDate();
  const rows = DAY_NAMES.map((nm, i) => {
    const d = week.days[nm], ds = addDays(monday, i);
    const b = el('button', { type: 'button', class: `wd${ds === today ? ' today' : ''}`, style: `--kc:var(${KIND[d.kind][1]})` },
      el('div', { class: 'd' }, el('span', {}, nm.slice(0, 3)), el('b', {}, String(toUTC(ds).getUTCDate()))),
      el('div', { class: 't' }, el('b', {}, d.title), el('span', {}, d.kind === 'rest' ? 'Optional' : `About ${d.minutes} min · ${KIND[d.kind][0]}`)),
      el('span', { class: 'bar' }));
    b.addEventListener('click', () => { setView('today'); go(ds); });
    return b;
  });
  return [el('div', { class: 'sectionhead' }, el('h2', {}, `Week ${w.real}: ${week.phase.name}`), el('p', {}, week.phase.rule)),
    el('div', { class: 'wk' }, rows),
    el('div', { class: 'sectionhead' }, el('h2', {}, 'Rules')), el('div', { class: 'ci', style: 'margin-top:10px' }, el('ol', { class: 'plain' }, week.rules.map(r => el('li', {}, r))))];
}

const isBuilt = c => !c.built.startsWith('Habit') && !c.built.startsWith('Not yet');
function longView(day) {
  const built = meta.core.filter(isBuilt).length;
  return [el('div', { class: 'sectionhead' }, el('h2', {}, 'The longevity core'),
      el('p', {}, `What Huberman, Peter Attia, the movement coaches and the research agree on. ${built} of ${meta.core.length} are built into your week; the rest are daily habits.`)),
    el('div', { class: 'core' }, meta.core.map(c => el('div', { class: 'ci' },
      el('div', { class: 'top' }, el('h3', {}, c.name), el('span', { class: `badge ${isBuilt(c) ? 'in' : 'hb'}` }, isBuilt(c) ? 'Built in' : 'Habit')),
      el('p', { class: 'dose' }, c.dose), el('p', { class: 'built' }, c.built),
      el('details', { class: 'more' }, el('summary', {}, 'Why'), el('p', { class: 'ev' }, c.why), el('p', { class: 'who' }, `Agreed by: ${c.who}`))))),
    el('div', { class: 'sectionhead' }, el('h2', {}, 'Today, on top of the workout')),
    el('div', { class: 'core' }, day.longevity.map(h => el('div', { class: 'ci' }, el('h3', {}, h.name), el('p', { class: 'dose' }, h.dose), el('p', { class: 'built' }, h.why))),
      day.mental ? el('div', { class: 'ci' }, el('h3', {}, 'Mind'), el('p', { class: 'dose' }, el('a', { href: day.mental.url, target: '_blank', rel: 'noopener' }, day.mental.name), ` · ${day.mental.dose}`)) : null),
    el('div', { class: 'tl', style: 'margin-top:24px' }, stretchNode(1, day, true))];
}

function paintView() {
  const k = `var(${KIND[currentDay.kind][1]})`;
  $('app').style.setProperty('--k', k);
  const isToday = current === easternDate();
  const parts = view === 'week' ? weekView(currentWeek, current) : view === 'long' ? longView(currentDay) : todayView(currentWeek, currentDay, isToday);
  $('main').replaceChildren(...parts.flat(Infinity).filter(Boolean));
  updateProgress();
}

async function render(date) {
  const w = weekFor(date, meta.startDate, meta.weeks);
  const week = await loadWeek(w.file);
  const dayName = DAY_NAMES[w.dayIndex];
  const day = week.days[dayName];
  const today = easternDate();
  current = date; currentWeek = week; currentDay = day;
  $('kicker').textContent = `Week ${w.real} · ${week.phase.name}${w.before ? ' · starts Nov 16' : ''}`;
  $('title').textContent = day.title;
  $('sub').textContent = `${date === today ? 'Today · ' : ''}${dayName}, ${shortDate(date)}`;
  const monday = addDays(date, -w.dayIndex);
  $('days').replaceChildren(...DAY_NAMES.map((nm, i) => {
    const d = addDays(monday, i);
    const b = el('button', { type: 'button', 'aria-pressed': String(d === date), class: d === today ? 'today' : '', style: `--kc:var(${KIND[week.days[nm].kind][1]})`, 'aria-label': `${nm} ${shortDate(d)}: ${week.days[nm].title}` },
      nm.slice(0, 3), el('b', {}, String(toUTC(d).getUTCDate())));
    b.addEventListener('click', () => go(d));
    return b;
  }));
  $('date').value = date;
  paintView();
}

function go(date) {
  const url = new URL(location.href);
  if (date === easternDate()) url.searchParams.delete('date'); else url.searchParams.set('date', date);
  history.replaceState(null, '', url);
  render(date).catch(fail);
  window.scrollTo(0, 0);
}
function setView(v) {
  view = v;
  for (const [id, name] of [['tab-today', 'today'], ['tab-week', 'week'], ['tab-long', 'long']]) $(id).setAttribute('aria-pressed', String(v === name));
}
function setLoc(v) {
  loc = v; store.set('loc', v);
  $('loc-home').setAttribute('aria-pressed', String(v === 'home'));
  $('loc-gym').setAttribute('aria-pressed', String(v === 'gym'));
}
function fail() { $('main').replaceChildren(el('section', { class: 'brief' }, el('p', {}, 'The workout could not load. Pull to refresh.'))); }

async function start() {
  const r = await fetch('./program.json');
  if (!r.ok) throw new Error('program unavailable');
  meta = await r.json();
  $('version').textContent = 'Program ' + meta.version;
  setLoc(loc);
  $('loc-home').addEventListener('click', () => { setLoc('home'); paintView(); });
  $('loc-gym').addEventListener('click', () => { setLoc('gym'); paintView(); });
  for (const [id, name] of [['tab-today', 'today'], ['tab-week', 'week'], ['tab-long', 'long']])
    $(id).addEventListener('click', () => { setView(name); paintView(); window.scrollTo(0, 0); });
  $('date').addEventListener('change', e => { if (validDate(e.target.value)) go(e.target.value); });
  $('timer').addEventListener('click', () => { clearInterval(timerId); $('timer').classList.remove('on'); });
  const q = new URLSearchParams(location.search);
  const v = q.get('view');
  if (v === 'week' || v === 'long') setView(v);
  await render(validDate(q.get('date')) ? q.get('date') : easternDate());
}

start().catch(fail);
