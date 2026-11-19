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
/* ---------- Moving demos and pictures (from Codex's Workout Hub) ---------- */
// A loop loads only when it scrolls into view, plays silently, and pauses when off screen.
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
}), { rootMargin: '150px' }) : null;
function loop(c, onFail) {
  if (!c) return null;
  const v = el('video', { class: 'loop', loop: '', playsinline: '', 'webkit-playsinline': '', preload: 'none', 'data-src': c.src, 'aria-label': `Moving demo by ${c.by}` });
  v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
  const fig = el('figure', { class: 'fig' }, v, el('figcaption', {}, `Moving demo · ${c.by}`, c.note ? ` · ${c.note}` : ''));
  v.addEventListener('error', () => { if (onFail) onFail(); else fig.replaceChildren(el('figcaption', {}, 'The moving demo did not load. Use the coach video.')); });
  if (io) io.observe(v); else { v.src = c.src; v.autoplay = true; }
  return fig;
}
function still(p, cls = 'fig') {
  if (!p) return null;
  return el('figure', { class: cls }, el('img', { src: p.src, alt: p.cap, loading: 'lazy' }), el('figcaption', {}, p.cap, p.note ? ` · ${p.note}` : ''));
}
// One media box per lift: moving demo, pictures, coach video. Tabs pick which one shows.
function mediaTabs(ex, g) {
  const opts = [];
  const c = g ? (ex.gymClip || (ex.gymVideo ? null : ex.clip)) : ex.clip;
  if (c) opts.push(['Demo', () => loop(c, () => fallback())]);
  if (ex.pic && !g) opts.push(['Pictures', () => still(ex.pic)]);
  const v = g && ex.gymVideo ? ex.gymVideo : ex.video;
  if (v) opts.push([v.yt ? 'Coach video' : 'Coach guide', () => media(v)]);
  if (!opts.length) return null;
  const box = el('div', { class: 'mbox' });
  // If the demo clip can't load, quietly show the next option instead.
  const fallback = () => {
    const rest = opts.slice(1);
    if (!rest.length) { box.replaceChildren(el('p', { class: 'src' }, 'The demo did not load.')); return; }
    opts.splice(0, 1); bar?.querySelector('button')?.remove();
    bar?.querySelector('button')?.setAttribute('aria-pressed', 'true');
    box.replaceChildren(opts[0][1]());
  };
  let bar = null;
  box.append(opts[0][1]());
  if (opts.length === 1) return box;
  bar = el('div', { class: 'mtabs', role: 'group', 'aria-label': `How ${ex.name} looks` });
  for (const [name, make] of opts) {
    const b = el('button', { type: 'button', 'aria-pressed': String(name === opts[0][0]) }, name);
    b.addEventListener('click', () => { bar.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); box.replaceChildren(make()); });
    bar.append(b);
  }
  return el('div', {}, bar, box);
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
      x.pic ? still(x.pic, 'fig small') : null,
      el('div', { class: 'chips' }, x.clip ? loopChip(x.clip) : null, miniMedia(x.video))));
}
function loopChip(c) {
  const b = el('button', { type: 'button', class: 'chipbtn' }, 'Moving demo');
  b.addEventListener('click', () => b.replaceWith(loop(c)));
  return b;
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
    vid.replaceChildren(mediaTabs(ex, g));
    swap.textContent = other ? 'Back' : (gym ? 'See the home version' : 'See the gym version');
  };
  swap.addEventListener('click', () => { other = !other; paint(); });
  paint();
  const wkey = `wt:${ex.name}`;
  const wt = el('input', { class: 'wt', type: 'text', inputmode: 'decimal', placeholder: 'Weight', 'aria-label': `${ex.name} weight`, value: store.get(wkey, '') });
  wt.addEventListener('change', () => store.set(wkey, wt.value.trim()));
  const sets = el('div', { class: 'sets' });
  const n = setCount(ex, date);
  for (let s = 1; s <= n; s++) sets.append(toggle(`set:${date}:${i}:${s}`, `${ex.name} set ${s} done`, () => ex.rest && startTimer(ex.rest), 'set', String(s)));
  sets.append(wt);
  return el('div', { class: 'lift' },
    el('div', { class: 'lh' }, el('span', { class: 'num' }, String(i + 1).padStart(2, '0')), el('h3', {}, ex.name), el('span', { class: 'dose' }, `${setCount(ex, date)}×${ex.reps}`)),
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

// Readiness: "so-so" drops one set from each lift (never below 1), as in Codex's hub.
const readyOf = date => store.get(`ready:${date}`, '');
const setCount = (ex, date) => readyOf(date) === 'yellow' ? Math.max(1, ex.sets - 1) : ex.sets;

function readyNode(n, day) {
  const R = meta.readiness, key = `ready:${day.date}`;
  const bar = el('div', { class: 'rd', role: 'group', 'aria-label': 'How do you feel today' });
  const out = el('p', { class: 'rd-out' });
  const v = readyOf(day.date);
  for (const k of ['green', 'yellow', 'red']) {
    const b = el('button', { type: 'button', class: `rb ${k}`, 'aria-pressed': String(v === k) }, R[k].label);
    b.addEventListener('click', () => { store.set(key, k); paintView(); });
    bar.append(b);
  }
  out.textContent = v ? R[v].text : 'Pick one before you start. It sets today\'s dose.';
  return node(n, 'FIRST · 30 SEC', 'How do you feel?', [bar, out], !v || v !== 'green');
}

function mindNode(n, day) {
  const m = day.mental;
  if (!m) return null;
  return node(n, 'AFTER · 3–5 MIN', 'Mind', [still({ src: 'img/mind.jpg', cap: 'Sit tall, feet down, hands on the thighs' }, 'fig small'),
    el('p', {}, el('a', { href: m.url, target: '_blank', rel: 'noopener' }, m.name), ` · ${m.dose}`),
    el('p', { class: 'lead' }, 'Breathe normally. When your mind wanders, notice it and come back to the breath. That return is the practice.')], false);
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
  const r = readyOf(day.date);
  return logCore(day) + (r ? ` Felt: ${meta.readiness[r].label.toLowerCase()}.` : '');
}
function logCore(day) {
  const d = `${day.weekday.slice(0, 3)} ${shortDate(day.date)}`;
  if (day.kind !== 'lift') return `Done: ${day.title}, ${d}${day.kind === 'rest' ? '' : `, ${day.minutes} min`}.`;
  const parts = day.lifts.map((ex, i) => {
    const done = [...Array(setCount(ex, day.date))].filter((_, s) => store.get(`set:${day.date}:${i}:${s + 1}`, 'false') === 'true').length;
    const w = store.get(`wt:${ex.name}`, '');
    return `${ex.name}${w ? ' ' + w : ''}: ${done}/${setCount(ex, day.date)} sets`;
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

/* ---------- Ride weather: rain, storms and wind for the ride itself ----------
   Codex's hub checked rain every 15 minutes, lightning, alerts and wind for out-and-back.
   Here the location stays on this phone (never in the public page): Open-Meteo for the
   15-minute forecast and wind, the National Weather Service for alerts. */
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
const dirName = deg => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const clockET = ms => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
function meanDir(degs) {
  const x = degs.reduce((a, d) => a + Math.cos(d * Math.PI / 180), 0), y = degs.reduce((a, d) => a + Math.sin(d * Math.PI / 180), 0);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
export function rideCall({ thunder, alerts, rainIn, pop, wind, gust, from }) {
  const storm = thunder || alerts.some(a => /thunder|tornado|hurricane|tropical|lightning/i.test(a));
  const verdict = storm ? 'Storms nearby: do the kettlebell circuit.'
    : rainIn >= 0.05 || pop >= 60 ? 'Rain likely during the ride: do the kettlebell circuit.'
    : pop >= 30 || rainIn > 0 ? 'Some chance of rain: check the radar before you go.' : 'Good to ride.';
  const windLine = wind < 4 ? 'Almost no wind: any direction works.'
    : `Wind from the ${from} at ${wind} mph${gust > wind + 3 ? `, gusts ${gust}` : ''}. Head out toward the ${from}, into the wind, so it pushes you home when you're tired.` +
      (gust >= 25 ? ' Gusty: easy on bridges and open stretches.' : '');
  return { verdict, windLine, swap: verdict.includes('kettlebell') };
}
async function weather(box, ask, minutes) {
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
  box.textContent = 'Checking rain, storms and wind for your ride…';
  const now = Date.now(), end = now + (minutes + 15) * 6e4;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&minutely_15=precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,apparent_temperature' +
      '&hourly=precipitation_probability&daily=sunrise&forecast_minutely_15=16&past_minutely_15=1&forecast_hours=4&forecast_days=1' +
      '&timezone=America%2FNew_York&wind_speed_unit=mph&precipitation_unit=inch&temperature_unit=fahrenheit&timeformat=unixtime';
    const [om, al] = await Promise.all([
      fetch(u).then(r => { if (!r.ok) throw new Error('forecast'); return r.json(); }),
      fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, { headers: { Accept: 'application/geo+json' } }).then(r => r.json()).catch(() => null)]);
    const q = om.minutely_15;
    const idx = q.time.map((t, i) => [t * 1000, i]).filter(([t]) => t >= now - 9e5 && t <= end).map(([, i]) => i);
    if (!idx.length) throw new Error('no samples');
    const pick = k => idx.map(i => q[k][i]).filter(v => v != null);
    const h = om.hourly;
    const pops = h.time.map((t, i) => [t * 1000, h.precipitation_probability[i]]).filter(([t]) => t >= now - 36e5 && t <= end).map(([, p]) => p ?? 0);
    const alerts = (al?.features || []).map(f => f.properties.event);
    const wind = Math.round(pick('wind_speed_10m').reduce((a, b) => a + b, 0) / Math.max(1, pick('wind_speed_10m').length));
    const call = rideCall({
      thunder: pick('weather_code').some(c => c >= 95), alerts,
      rainIn: pick('precipitation').reduce((a, b) => a + b, 0), pop: Math.max(0, ...pops),
      wind, gust: Math.round(Math.max(0, ...pick('wind_gusts_10m'))), from: dirName(meanDir(pick('wind_direction_10m'))),
    });
    const t = Math.round(q.temperature_2m[idx[0]]), feels = Math.round(q.apparent_temperature[idx[0]]);
    const sunrise = om.daily?.sunrise?.[0] ? om.daily.sunrise[0] * 1000 : null;
    box.classList.toggle('bad', call.swap);
    box.replaceChildren(el('b', {}, call.verdict), el('ul', { class: 'wxl' },
      el('li', {}, call.windLine),
      el('li', {}, `${t}°F, feels like ${feels}°F. Rain chance up to ${Math.max(0, ...pops)}% until ${clockET(end)}.` + (feels >= 82 ? ' Warm and humid: extra water and electrolytes.' : '')),
      sunrise && sunrise > now ? el('li', {}, `Sunrise ${clockET(sunrise)}: lights on until then.`) : null,
      alerts.length ? el('li', {}, `Weather alert: ${[...new Set(alerts)].join(', ')}.`) : null),
      el('p', { class: 'src' }, `Checked ${clockET(now)} for the next ${minutes + 15} min. Open-Meteo and the National Weather Service.`));
  } catch {
    try {
      const pt = await (await fetch(`https://api.weather.gov/points/${lat},${lon}`)).json();
      const fc = await (await fetch(pt.properties.forecastHourly)).json();
      const next = fc.properties.periods.filter(p => new Date(p.endTime) > now).slice(0, 3);
      const rain = Math.max(...next.map(p => p.probabilityOfPrecipitation?.value || 0));
      const storm = next.some(p => /thunder|lightning/i.test(p.shortForecast));
      const p0 = next[0];
      box.replaceChildren(el('b', {}, storm ? 'Storms nearby: do the kettlebell circuit.' : rain >= 60 ? 'Rain likely: do the kettlebell circuit.' : rain >= 30 ? 'Some chance of rain: check the radar first.' : 'Good to ride.'),
        `Next 3 hours: ${p0.temperature}°${p0.temperatureUnit}, ${p0.shortForecast.toLowerCase()}, rain up to ${rain}%, wind ${p0.windDirection} ${p0.windSpeed}.`);
    } catch { box.textContent = 'The forecast did not load. Check your weather app.'; }
  }
}

/* ---------- Ride timer: calls each block of the ride (Codex's v3 ride timeline) ---------- */
const ZONE = { easy: ['--ride', 14, .55], steady: ['--ride', 24, 1], hard: ['--hiit', 40, 1] };
let ride = null;
function beep(times = 1) {
  try {
    const ctx = ride?.ctx; if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .35;
      o.frequency.value = 880; g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .25);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + .26);
    }
  } catch {}
}
function stopRide() {
  if (!ride) return;
  clearInterval(ride.id); ride.lock?.release?.().catch(() => {}); ride.ctx?.close?.().catch(() => {});
  ride = null; $('ridebar').classList.remove('on');
  document.querySelectorAll('.rt li.now').forEach(li => li.classList.remove('now'));
  document.querySelectorAll('[data-ridebtn]').forEach(b => { b.textContent = 'Start ride timer'; });
}
function startRide(day) {
  stopRide();
  const t = day.timeline, t0 = Date.now();
  ride = { id: 0, lock: null, ctx: null, last: -1, date: day.date };
  try { ride.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  navigator.wakeLock?.request('screen').then(l => { if (ride) ride.lock = l; }).catch(() => {});
  document.querySelectorAll('[data-ridebtn]').forEach(b => { b.textContent = 'Stop ride timer'; });
  document.querySelectorAll('[data-ridelist]').forEach(d => { d.open = true; });
  const bar = $('ridebar'); bar.classList.add('on');
  const tick = () => {
    const s = Math.floor((Date.now() - t0) / 1000), i = t.findIndex(b => s < b.to * 60);
    if (i < 0) { beep(3); navigator.vibrate?.([300, 150, 300, 150, 300]); stopRide(); return; }
    if (i !== ride.last) {
      if (ride.last >= 0) { beep(t[i].zone === 'hard' ? 2 : 1); navigator.vibrate?.(t[i].zone === 'hard' ? [400, 150, 400] : [250]); }
      ride.last = i;
      document.querySelectorAll('.rt li').forEach(li => li.classList.toggle('now', +li.dataset.i === i));
    }
    const b = t[i], left = b.to * 60 - s;
    bar.style.setProperty('--zc', `var(${ZONE[b.zone][0]})`);
    bar.replaceChildren(el('b', {}, `${b.name} · ${mmss(left)}`), el('span', {}, `${b.effort} · next: ${t[i + 1] ? t[i + 1].name : 'cool-down'} · ${mmss(s)} in`));
  };
  ride.id = setInterval(tick, 1000); tick();
}
function rideTimeline(day) {
  const t = day.timeline;
  const shape = el('div', { class: 'shape', 'aria-hidden': 'true' }, t.map(b => el('div', { style: `flex:${b.to - b.from};background:var(${ZONE[b.zone][0]});height:${ZONE[b.zone][1]}px;opacity:${ZONE[b.zone][2]}` })));
  const btn = el('button', { type: 'button', class: 'btn full', 'data-ridebtn': '' }, ride && ride.date === day.date ? 'Stop ride timer' : 'Start ride timer');
  btn.addEventListener('click', () => (ride ? stopRide() : startRide(day)));
  const open = ride && ride.date === day.date;
  const rows = el('ol', { class: 'rt' }, t.map((b, i) => el('li', { 'data-i': String(i), class: ride && ride.date === day.date && ride.last === i ? 'now' : null, style: `--zc:var(${ZONE[b.zone][0]})` },
    el('span', { class: 'mm' }, `${b.from}–${b.to}`),
    el('div', {}, el('b', {}, b.name), el('span', { class: 'eff' }, `  ${b.effort}`), el('p', {}, b.cue), el('p', { class: 'win' }, `Win: ${b.win}`)))));
  const list = el('details', Object.assign({ class: 'more', 'data-ridelist': '' }, open ? { open: '' } : {}), el('summary', {}, `Minute by minute (${t.length} blocks)`), rows);
  return [shape, el('p', { class: 'src' }, 'Tall blocks are the hard parts. The timer beeps and buzzes at every change and keeps the screen on.'), btn, list];
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
    readyOf(day.date) && readyOf(day.date) !== 'green' && day.kind !== 'rest' ? el('div', { class: `callout ready ${readyOf(day.date)}` }, el('b', {}, `Today: ${meta.readiness[readyOf(day.date)].label}. `), meta.readiness[readyOf(day.date)].text) : null,
    el('div', { class: 'rule' }, el('b', {}, `This week · ${week.phase.name}. `), week.phase.rule));
}

function todayView(week, day, isToday) {
  const parts = [brief(day, week)];
  const tl = el('div', { class: 'tl' });
  let n = 1;
  if (day.kind !== 'rest' && meta.readiness) tl.append(readyNode(n++, day));
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
    const box = el('div', { class: 'wx' }, isToday ? 'Tap for rain, storms and which way to ride out, for your ride window where you are.' : 'The weather check works on the day itself.');
    const wbtn = el('button', { type: 'button', class: 'btn ghost' }, 'Check ride weather and wind');
    wbtn.addEventListener('click', () => weather(box, true, day.minutes));
    if (isToday && store.get('geo', '')) weather(box, false, day.minutes);
    tl.append(node(n++, 'BEFORE YOU GO', 'Ride prep', [day.prep.map((x, i) => el('div', { class: 'row' }, toggle(`prep:${day.date}:${i}`, x), el('div', {}, x))), wbtn, box]));
    const rideParts = [el('ol', { class: 'plain' }, day.how.map(x => el('li', {}, x)))];
    if (day.timeline) rideParts.push(rideTimeline(day));
    rideParts.push(el('table', { class: 'eff' }, el('tbody', {}, day.effort.map(e => el('tr', {}, el('td', {}, e.zone), el('td', {}, e.feel, el('br'), el('span', { class: 'src' }, e.use)))))),
      el('details', { class: 'more' }, el('summary', {}, week.swap.title), media(week.swap.video), el('ol', { class: 'plain' }, week.swap.how.map(x => el('li', {}, x))), el('p', { class: 'src' }, week.swap.note)));
    tl.append(node(n++, '0:00', `${day.title} · ${day.minutes} min`, rideParts));
    tl.append(coolNode(n++, hm(day.minutes), day));
  }
  const mind = mindNode(n, day);
  if (mind) { tl.append(mind); n++; }
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
