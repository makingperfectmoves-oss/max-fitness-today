import { easternDate, validDate } from './date.mjs';

const $ = id => document.getElementById(id);
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k);
  return n;
}

const toUTC = s => new Date(s + 'T12:00:00Z');
const addDays = (s, n) => new Date(toUTC(s).getTime() + n * 864e5).toISOString().slice(0, 10);
const shortDate = s => toUTC(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function weekFor(date, start, weeks) {
  const days = Math.floor((toUTC(date) - toUTC(start)) / 864e5);
  const real = days < 0 ? 1 : Math.floor(days / 7) + 1;
  const file = real <= weeks ? real : 7 + ((real - weeks - 1) % 6);
  const dayIndex = ((days % 7) + 7) % 7;
  return { real, file, dayIndex, before: days < 0 };
}

let meta, loc = store.get('loc', 'home'), timerId;
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
  const show = () => { t.textContent = `Rest ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · tap to stop`; };
  t.classList.add('on'); show();
  timerId = setInterval(() => {
    left -= 1;
    if (left <= 0) { clearInterval(timerId); t.textContent = 'Rest done · next set'; if (navigator.vibrate) navigator.vibrate(300); setTimeout(() => t.classList.remove('on'), 4000); return; }
    show();
  }, 1000);
}

function setButtons(date, ex, i) {
  const row = el('div', { class: 'row' });
  for (let s = 1; s <= ex.sets; s++) {
    const key = `set:${date}:${i}:${s}`;
    const b = el('button', { type: 'button', class: 'set', 'aria-pressed': store.get(key, 'false'), 'aria-label': `${ex.name} set ${s} done` }, String(s));
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on)); store.set(key, String(on));
      if (on && ex.rest) startTimer(ex.rest);
    });
    row.append(b);
  }
  row.append(el('a', { class: 'mini', href: ex.demo, target: '_blank', rel: 'noopener' }, 'Watch demo'));
  return row;
}

function exercise(ex, i, date) {
  const variant = loc === 'gym' ? ex.gym : ex.home;
  const other = loc === 'gym' ? ex.home : ex.gym;
  const otherBtn = el('button', { type: 'button', class: 'mini' }, loc === 'gym' ? 'Show home version' : 'Show gym version');
  const v = el('div', { class: 'variant' }, el('span', { class: 'tag' }, loc === 'gym' ? 'Gym' : 'Home'), variant);
  let showingOther = false;
  otherBtn.addEventListener('click', () => {
    showingOther = !showingOther;
    v.replaceChildren(el('span', { class: 'tag' }, (loc === 'gym') !== showingOther ? 'Gym' : 'Home'), showingOther ? other : variant);
    otherBtn.textContent = showingOther ? 'Back' : (loc === 'gym' ? 'Show home version' : 'Show gym version');
  });
  return el('div', { class: 'ex' },
    el('div', { class: 'ex-head' }, el('span', { class: 'ex-name' }, ex.name), el('span', { class: 'dose' }, `${ex.sets} × ${ex.reps}`)),
    v,
    el('p', { class: 'cue' }, ex.cue),
    el('div', { class: 'row' }, otherBtn, el('span', { class: 'src' }, `Rest ${Math.round(ex.rest / 60 * 10) / 10} min · ${ex.source}`)),
    setButtons(date, ex, i));
}

function simpleList(title, items, open = true) {
  const list = el('ol', { class: 'steps' }, items.map(x => el('li', {},
    typeof x === 'string' ? x : [el('b', {}, x.name), ` · ${x.dose}. `, x.home ? (loc === 'gym' ? x.gym : x.home) + ' ' : '', el('span', { class: 'cue' }, x.cue), ' ',
      x.demo ? el('a', { href: x.demo, target: '_blank', rel: 'noopener', class: 'src' }, 'demo') : null])));
  const d = el('details', open ? { open: '' } : {}, el('summary', {}, title), list);
  return el('section', {}, d);
}

function renderDay(week, day) {
  const main = $('main');
  const parts = [];
  const head = el('section', {},
    el('h2', {}, day.title),
    el('p', { class: 'meta' }, day.kind === 'ride' ? day.summary : `About ${day.minutes} min · ${day.summary}`));
  if (day.why) head.append(el('p', { class: 'note' }, day.why));
  if (day.safety) head.append(el('p', { class: 'safety' }, day.safety));
  if (day.source) head.append(el('p', { class: 'src' }, 'Source: ' + day.source));
  parts.push(head);

  if (day.kind === 'lift') {
    parts.push(simpleList('1 · Joint warm-up (10 min)', day.warmup, false));
    const lifts = el('section', {}, el('h3', {}, '2 · Main lifts'), ...day.lifts.map((ex, i) => exercise(ex, i, day.date)));
    parts.push(lifts);
    parts.push(simpleList('3 · Cool-down (5 min)', day.cooldown, false));
  } else {
    parts.push(el('section', {}, el('h3', {}, day.kind === 'rest' ? 'Mobility flow' : 'How to ride it'), el('ol', { class: 'steps' }, day.how.map(x => el('li', {}, x)))));
    if (day.swap) parts.push(el('section', {}, el('details', {}, el('summary', {}, week.swap.title),
      el('ol', { class: 'steps' }, week.swap.how.map(x => el('li', {}, x))), el('p', { class: 'note' }, week.swap.note), el('p', { class: 'src' }, 'Source: ' + week.swap.source))));
    if (day.optional) parts.push(el('section', {}, el('details', {}, el('summary', {}, day.optional.title),
      el('ol', { class: 'steps' }, day.optional.how.map(x => el('li', {}, x))), el('p', { class: 'note' }, day.optional.note), el('p', { class: 'src' }, 'Source: ' + day.optional.source))));
  }
  parts.push(el('section', {}, el('h3', {}, 'Every day'), el('ul', { class: 'steps' }, week.daily.map(x => el('li', {}, x))),
    el('p', { class: 'note' }, 'After your workout, reply to Duet: "done", "skip", or your numbers, e.g. "squat 50 for 10, 10, 9".')));
  main.replaceChildren(...parts);
}

async function render(date) {
  const w = weekFor(date, meta.startDate, meta.weeks);
  const week = await loadWeek(w.file);
  const dayName = DAY_NAMES[w.dayIndex];
  const day = week.days[dayName];
  const today = easternDate();
  $('kicker').textContent = `Week ${w.real} · ${week.phase.name}${w.before ? ' · starts Nov 16' : ''}`;
  $('title').textContent = date === today ? `Today: ${day.title}` : `${dayName}: ${day.title}`;
  $('sub').textContent = `${dayName}, ${shortDate(date)}`;
  $('phase').replaceChildren(el('b', {}, `This week's rule`), week.phase.rule);
  const monday = addDays(date, -w.dayIndex);
  $('days').replaceChildren(...DAY_NAMES.map((n, i) => {
    const d = addDays(monday, i);
    const b = el('button', { type: 'button', 'aria-pressed': String(d === date), class: d === today ? 'today' : '' }, n.slice(0, 3), el('b', {}, String(toUTC(d).getUTCDate())));
    b.addEventListener('click', () => go(d));
    return b;
  }));
  $('date').value = date;
  renderDay(week, day);
}

function go(date) {
  const url = new URL(location.href);
  if (date === easternDate()) url.searchParams.delete('date'); else url.searchParams.set('date', date);
  history.replaceState(null, '', url);
  render(date).catch(fail);
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
  $('loc-home').addEventListener('click', () => { setLoc('home'); render($('date').value).catch(fail); });
  $('loc-gym').addEventListener('click', () => { setLoc('gym'); render($('date').value).catch(fail); });
  $('date').addEventListener('change', e => { if (validDate(e.target.value)) go(e.target.value); });
  $('timer').addEventListener('click', () => { clearInterval(timerId); $('timer').classList.remove('on'); });
  const q = new URLSearchParams(location.search).get('date');
  await render(validDate(q) ? q : easternDate());
}

start().catch(fail);
