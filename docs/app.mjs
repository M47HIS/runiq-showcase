import { calendarDates, calendarDayLock, moveCalendarSession } from "./scheduler.mjs";
import { demoPlan, today, lockedIds, applyDates, validSavedDates } from "./fixture.mjs?v=2";

const storageKey = "runiq-showcase:week:v1";
const editor = document.querySelector("#editor");
const status = document.querySelector("#status");
const weekTitle = document.querySelector("#week-title");
const tryMove = document.querySelector("#try-move");
const reset = document.querySelector("#reset");
const shortDay = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" });
const asDate = iso => new Date(iso + "T12:00:00Z");
const days = calendarDates(demoPlan, 0);
const openWorkouts = new Set();
const totalKm = demoPlan.workouts.reduce((total, workout) => total + workout.km, 0);
document.querySelector("#week-summary").textContent = `${demoPlan.workouts.length} runs · ${totalKm} km`;

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
  const changed = plan.workouts.filter(workout => dates[workout.id]);
  const workoutOn = date => plan.workouts.find(workout => (dates[workout.id] ?? workout.date) === date);
  tryMove.disabled = Boolean(selected) || reviewing;
  editor.innerHTML = `
    ${selected ? `<div class="decision">
      <div>
        <h3 id="move-title" tabindex="-1">Move ${selected.title}</h3>
        <p id="move-help">Choose a day below. An occupied day swaps both workouts.</p>
      </div>
      <button class="quiet" data-action="cancel">Cancel</button>
    </div>` : ""}
    ${!selected && changed.length && !reviewing ? `<div class="decision">
      <h3>${changed.length} ${changed.length === 1 ? "workout" : "workouts"} moved</h3>
      <div class="decision-actions"><button class="quiet" data-action="discard">Discard</button><button class="primary" data-action="review">Review changes</button></div>
    </div>` : ""}
    ${reviewing ? `<section class="review" aria-labelledby="review-title">
      <h3 id="review-title" tabindex="-1">Review changes</h3>
      <ul>${changed.map(workout =>
        `<li><strong>${workout.title}</strong><span>${shortDay.format(asDate(workout.date))} ${Number(workout.date.slice(-2))} <span class="sr-only">to</span><span aria-hidden="true">→</span> ${shortDay.format(asDate(dates[workout.id]))} ${Number(dates[workout.id].slice(-2))}</span></li>`).join("")}</ul>
      <div class="decision-actions"><button class="quiet" data-action="back">Back</button><button class="primary" data-action="save">Save week</button></div>
    </section>` : ""}
    <ol class="agenda" aria-label="Training days">${days.map(date => {
      const workout = workoutOn(date);
      const lock = calendarDayLock({ plan, date, localDate: today, workout, lockedIds });
      const isToday = date === today;
      const isSource = Boolean(selected && selected.id === workout?.id);
      const canMoveHere = selected && !isSource && !lock;
      const action = workout ? "Swap" : "Move here";
      const complete = workout && lockedIds.has(workout.id);
      const changedDate = workout && dates[workout.id];
      const rowClass = isSource ? " moving" : changedDate ? " changed" : "";
      return `<li class="day${isToday ? " today" : ""}${rowClass}">
        <time class="date" datetime="${date}"${isToday ? ' aria-current="date"' : ""}><span>${shortDay.format(asDate(date))}</span><strong>${Number(date.slice(-2))}</strong></time>
        <div class="session">
          ${workout ? `<details class="workout ${workout.kind.toLowerCase()}" data-workout="${workout.id}"${openWorkouts.has(workout.id) ? " open" : ""}>
            <summary><span class="session-title">${workout.title}</span><span class="meta">${workout.kind} · ${workout.km} km${changedDate ? " · Draft" : ""}</span></summary>
            ${workout.repeats ? `<div class="intervals-profile" aria-hidden="true"><span class="easy-segment"></span>${'<span class="fast-segment"></span><span class="jog-segment"></span>'.repeat(workout.repeats)}<span class="easy-segment"></span></div>` : ""}
            <ol class="steps">${workout.steps.map(step => `<li>${step}</li>`).join("")}</ol>
          </details>` : `<span class="rest">${lock === "break" ? "Planned break" : "Rest day"}</span>`}
        </div>
        <div class="actions">${complete ? '<span class="complete">Completed</span>' :
          isSource ? '<span class="move-label">Moving</span>' :
          canMoveHere ? `<button class="destination" data-to="${date}" aria-describedby="move-help" aria-label="${workout ? `Swap with ${workout.title} on` : "Move to"} ${fullDay.format(asDate(date))}">${action}</button>` :
          workout && !lock && !selected && !reviewing ? `<button data-move="${workout.id}" aria-label="Move ${workout.title}">Move</button>` : ""}
        </div>
      </li>`;
    }).join("")}</ol>`;
  if (focus) editor.querySelector(focus)?.focus();
}

function startMove(id) {
  status.textContent = "";
  selected = plan.workouts.find(workout => workout.id === id);
  render("#move-title");
}

editor.addEventListener("toggle", event => {
  const details = event.target;
  const id = details.dataset.workout;
  if (!id || !editor.contains(details)) return;
  if (details.open) openWorkouts.add(id);
  else openWorkouts.delete(id);
}, true);

tryMove.addEventListener("click", () => startMove("intervals"));

editor.addEventListener("keydown", event => {
  if (event.key === "Escape" && selected) {
    event.preventDefault();
    editor.querySelector('[data-action="cancel"]').click();
  }
});

editor.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const { move, to, action } = button.dataset;
  status.textContent = "";
  if (move) {
    startMove(move);
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
    if (!Object.keys(dates).length) status.textContent = "Draft cleared.";
  } else if (action === "cancel") {
    const id = selected.id;
    selected = undefined;
    render(`[data-move="${id}"]`);
  } else if (action === "discard") {
    dates = {};
    render();
    weekTitle.focus();
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
    render();
    weekTitle.focus();
    status.textContent = "Week saved to this browser.";
  }
});

reset.addEventListener("click", () => {
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
  openWorkouts.clear();
  render();
  status.textContent = "Demo reset.";
});

render();
tryMove.hidden = false;
reset.hidden = false;
