// Adapted from the RunIQ mobile Plan draft scheduler.
function plusDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function calendarDates(plan, week) {
  if (!Number.isInteger(week) || week < 0 || week >= plan.profile.weeks) return [];
  return Array.from({ length: 7 }, (_, day) => plusDays(plan.profile.startDate, week * 7 + day));
}

/** Lock shared by the rendered row and the draft move guards. */
export function calendarDayLock({ plan, date, localDate, workout, lockedIds }) {
  if (date < localDate) return "past";
  if (plan.profile.breaks?.some(pause => date >= pause.from && date <= pause.to)) return "break";
  if (workout && lockedIds.has(workout.id)) return "outcome";
  return null;
}

/** Draft dates only. Saving happens outside the draft scheduler. */
export function moveCalendarSession({ plan, week, dates, workoutId, destination, localDate, lockedIds }) {
  const days = calendarDates(plan, week);
  const workouts = plan.workouts.filter(workout => days.includes(workout.date));
  const source = workouts.find(workout => workout.id === workoutId);
  const currentDate = source && (dates[source.id] ?? source.date);
  const reject = (error) => ({ dates, error });
  if (!source || !currentDate || source.date < localDate || lockedIds.has(source.id))
    return reject("Completed and past sessions stay in place.");
  if (!days.includes(destination) || destination < localDate)
    return reject("Choose an upcoming day in this training week.");
  if (plan.profile.breaks?.some(pause => destination >= pause.from && destination <= pause.to))
    return reject("That day is in a planned break.");
  if (destination === currentDate)
    return { dates };
  const occupied = workouts.find(workout => workout.id !== workoutId && (dates[workout.id] ?? workout.date) === destination);
  if (occupied && (lockedIds.has(occupied.id) || occupied.date < localDate))
    return reject("A recorded session on that day cannot be swapped.");
  const next = { ...dates, [source.id]: destination };
  if (occupied) next[occupied.id] = currentDate;
  for (const workout of workouts) if (next[workout.id] === workout.date) delete next[workout.id];
  return { dates: next, swappedId: occupied?.id };
}
