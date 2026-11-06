import { dayFor, easternDate, validDate } from './date.mjs';

const date = document.querySelector('#date');
const week = document.querySelector('#week');
const location = document.querySelector('#location');
const card = document.querySelector('#card');
const headingDate = document.querySelector('#calendar-label');
const query = new URLSearchParams(window.location.search);

function node(name, content) {
  const element = document.createElement(name);
  element.textContent = content;
  return element;
}

function list(title, items) {
  if (!items.length) return;
  card.append(node('h3', title));
  const list = document.createElement('ol');
  for (const [name, cue] of items) {
    const item = node('li', name);
    if (cue) {
      const detail = node('span', cue);
      detail.className = 'cue';
      item.append(detail);
    }
    list.append(item);
  }
  card.append(list);
}

async function start() {
  const response = await fetch('./program.json');
  if (!response.ok) throw new Error('Program unavailable');
  const { weeks } = await response.json();
  date.value = validDate(query.get('date')) ? query.get('date') : easternDate();
  for (const plan of weeks) {
    const option = node('option', 'Week ' + plan.week);
    option.value = String(plan.week);
    week.append(option);
  }
  week.value = String(weeks.find(plan => String(plan.week) === query.get('week'))?.week ?? 1);

  function render() {
    if (!validDate(date.value)) return;
    const weekday = dayFor(date.value);
    const plan = weeks[Number(week.value) - 1];
    const day = plan.days[weekday];
    headingDate.textContent = weekday + ', ' + date.value + ' Eastern';
    card.replaceChildren(node('h2', day.title), node('p', day.summary), node('p', plan.phase.gate));
    card.append(node('p', 'Stop for chest pain, faintness, unusual breathlessness, new neurologic symptoms, or sharp or escalating pain.'));
    const routine = rows => rows.map(x => [x.name + ' · ' + x.time, x.cue]);
    list('Preparation', routine(day.prep));
    list('Ride', day.ride.map(x => [x.start + '–' + x.end + ' min · ' + x.title + ' · ' + x.effort, x.cue]));
    list('Strength', (day.strength?.[location.value] ?? []).map(x => [x.name + ' · ' + x.sets + ' × ' + x.reps + ' · Rest ' + x.rest + ' · ' + x.repsLeft, [x.start,x.move,x.finish,x.avoid,x.limitation].filter(Boolean).join(' ')]));
    list('Optional mobility and recovery', routine(day.routine));
    list('Cooldown', routine(day.cooldown));
    if (day.mental.duration) list('Mental practice', [[day.mental.duration, day.mental.label || day.mental.title || '']]);
  }
  for (const control of [date, week, location]) control.addEventListener('change', render);
  render();
}

start().catch(() => card.replaceChildren(node('p', 'The workout could not load. Try the program data link below.')));
