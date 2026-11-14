import { calendarDates, calendarDayLock, moveCalendarSession } from "./scheduler.mjs";
import { demoPlan, today, lockedIds, applyDates, validSavedDates } from "./fixture.mjs";

const storageKey = "runiq-showcase:week:v1";
const editor = document.querySelector("#editor");
const status = document.querySelector("#status");
const shortDay = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" });
const asDate = iso => new Date(iso + "T12:00:00Z");
const days = calendarDates(demoPlan, 0);

let plan = demoPlan;
let dates = {};
let selected;
let reviewing = false;
try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (validSavedDates(demoPlan, stored)) plan = applyDates(demoPlan, stored);
} catch {
  // The demo remains usable when browser storage is unavailable.
}

function render(focus) {
  const draft = Object.keys(dates).length > 0;
  const workoutOn = date => plan.workouts.find(workout => (dates[workout.id] ?? workout.date) === date);
  editor.innerHTML = `
    <ol class="agenda" aria-label="Training days">${days.map(date => {
      const workout = workoutOn(date);
      const lock = calendarDayLock({ plan, date, localDate: today, workout, lockedIds });
      const active = date === today;
      const moving = selected && selected.id !== workout?.id && !lock;
      const swapped = moving && workout;
      const label = lock === "break" ? "Planned break" : "Rest day";
      return `<li class="day${active ? " today" : ""}${lock ? " locked" : ""}">
        <div class="date"><span>${shortDay.format(asDate(date))}</span><strong>${Number(date.slice(-2))}</strong></div>
        <div class="session">
          ${workout ? `<details><summary>${workout.title}</summary><p>${workout.steps}</p></details>
            <span class="meta"><span class="kind ${workout.kind.toLowerCase()}">${workout.kind}</span> · ${workout.km} km${dates[workout.id] ? " · Moved" : ""}</span>` :
            `<span class="rest">${label}</span>`}
        </div>
        <div class="actions">${lock === "outcome" || (workout && lockedIds.has(workout.id)) ? '<span class="complete">Completed</span>' :
          moving ? `<button data-to="${date}" aria-label="${swapped ? "Swap with" : "Move to"} ${fullDay.format(asDate(date))}">${swapped ? "Swap" : "Move here"}</button>` :
          workout && !lock && !selected ? `<button data-move="${workout.id}" aria-label="Move ${workout.title}">Move</button>` : ""}
        </div>
      </li>`;
    }).join("")}</ol>
    ${selected ? `<div class="decision"><span>Choose a day for <strong>${selected.title}</strong>.</span><button class="quiet" data-action="cancel">Cancel</button></div>` : ""}
    ${!selected && draft && !reviewing ? '<div class="decision"><span>Draft changes</span><div><button class="quiet" data-action="discard">Discard</button><button class="primary" data-action="review">Review changes</button></div></div>' : ""}
    ${reviewing ? `<div class="review" aria-labelledby="review-title">
      <h3 id="review-title" tabindex="-1">Review changes</h3>
      <ul>${plan.workouts.filter(workout => dates[workout.id]).map(workout =>
        `<li><strong>${workout.title}</strong><span>${fullDay.format(asDate(workout.date))} → ${fullDay.format(asDate(dates[workout.id]))}</span></li>`).join("")}</ul>
      <div class="review-actions"><button class="quiet" data-action="back">Back</button><button class="primary" data-action="save">Save week</button></div>
    </div>` : ""}`;
  if (focus) editor.querySelector(focus)?.focus();
}

editor.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const { move, to, action } = button.dataset;
  status.textContent = "";
  if (move) {
    selected = plan.workouts.find(workout => workout.id === move);
    reviewing = false;
    render("[data-to]");
  } else if (to && selected) {
    const result = moveCalendarSession({ plan, week: 0, dates, workoutId: selected.id, destination: to, localDate: today, lockedIds });
    if (result.error) {
      status.textContent = result.error;
      return;
    }
    const id = selected.id;
    dates = result.dates;
    selected = undefined;
    render(Object.keys(dates).length ? '[data-action="review"]' : `[data-move="${id}"]`);
  } else if (action === "cancel") {
    const id = selected.id;
    selected = undefined;
    render(`[data-move="${id}"]`);
  } else if (action === "discard") {
    dates = {};
    render("[data-move]");
    status.textContent = "Draft discarded.";
  } else if (action === "review") {
    reviewing = true;
    render("#review-title");
  } else if (action === "back") {
    reviewing = false;
    render('[data-action="review"]');
  } else if (action === "save" && reviewing) {
    const next = applyDates(plan, dates);
    const changes = Object.fromEntries(next.workouts
      .filter(workout => demoPlan.workouts.find(original => original.id === workout.id).date !== workout.date)
      .map(workout => [workout.id, workout.date]));
    try {
      localStorage.setItem(storageKey, JSON.stringify(changes));
    } catch {
      status.textContent = "Browser storage is unavailable. Your draft is still here.";
      return;
    }
    plan = next;
    dates = {};
    reviewing = false;
    render("[data-move]");
    status.textContent = "Week saved.";
  }
});

document.querySelector("#reset").addEventListener("click", () => {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    status.textContent = "Browser storage is unavailable.";
    return;
  }
  plan = demoPlan;
  dates = {};
  reviewing = false;
  selected = undefined;
  render();
  status.textContent = "Demo reset.";
});

render();
