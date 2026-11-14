import assert from "node:assert/strict";
import test from "node:test";
import { calendarDates, calendarDayLock, moveCalendarSession } from "../docs/scheduler.mjs";
import { applyDates, demoPlan, lockedIds, today, validSavedDates } from "../docs/fixture.mjs";

const move = (workoutId, destination, dates = {}) => moveCalendarSession({
  plan: demoPlan, week: 0, dates, workoutId, destination, localDate: today, lockedIds,
});

test("agenda dates are anchored to the saved week", () => {
  assert.equal(calendarDates(demoPlan, 0).length, 7);
  assert.deepEqual(calendarDates(demoPlan, 1), []);
});

test("a completed workout on an upcoming day also stays locked", () => {
  const workout = demoPlan.workouts[1];
  const completed = new Set([workout.id]);
  assert.equal(calendarDayLock({ plan: demoPlan, date: workout.date, localDate: today, workout, lockedIds: completed }), "outcome");
  assert.ok(moveCalendarSession({ plan: demoPlan, week: 0, dates: {}, workoutId: workout.id, destination: today, localDate: today, lockedIds: completed }).error);
});

test("an occupied-day move swaps IDs in the draft and preserves prescription on save", () => {
  const original = structuredClone(demoPlan);
  const { dates, swappedId } = move("intervals", "2026-03-21");
  assert.equal(swappedId, "steady");
  assert.deepEqual(dates, { intervals: "2026-03-21", steady: "2026-03-19" });
  assert.deepEqual(demoPlan, original);
  assert.deepEqual(applyDates(demoPlan, dates).workouts.map(({ date, ...workout }) => workout),
    original.workouts.map(({ date, ...workout }) => workout));
});

test("chained moves use draft positions and a swap back clears both changes", () => {
  const { dates } = move("intervals", "2026-03-21");
  assert.deepEqual(move("intervals", "2026-03-19", dates).dates, {});
});

test("completed, past, break, and out-of-week moves cannot change a draft", () => {
  for (const [id, date] of [
    ["easy", today], ["intervals", "2026-03-16"], ["intervals", "2026-03-17"],
    ["intervals", "2026-03-20"], ["intervals", "2026-03-23"],
  ]) {
    const draft = {};
    const result = move(id, date, draft);
    assert.ok(result.error);
    assert.equal(result.dates, draft);
  }
});

test("reload accepts a saved swap and rejects locked dates, collisions, and unknown IDs", () => {
  assert.ok(validSavedDates(demoPlan, move("intervals", "2026-03-21").dates));
  for (const value of [{ easy: today }, { intervals: "2026-03-20" }, { intervals: "2026-03-21" }, { unknown: today }, null]) {
    assert.equal(validSavedDates(demoPlan, value), false);
  }
});
