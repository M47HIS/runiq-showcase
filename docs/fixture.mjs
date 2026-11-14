export const today = "2026-03-18";

export const demoPlan = {
  profile: {
    startDate: "2026-03-16",
    weeks: 1,
    breaks: [{ from: "2026-03-20", to: "2026-03-20" }],
  },
  workouts: [
    { id: "easy", date: "2026-03-16", kind: "Easy", title: "Easy run", km: 6, steps: "6 km at a conversational effort" },
    { id: "intervals", date: "2026-03-19", kind: "Intervals", title: "5 × 600 m", km: 8, steps: "2 km warm-up · 5 × (600 m fast + 200 m jog) · 2 km cool-down" },
    { id: "steady", date: "2026-03-21", kind: "Steady", title: "Steady run", km: 5, steps: "1 km easy · 3 km steady · 1 km easy" },
    { id: "long", date: "2026-03-22", kind: "Long", title: "Long run", km: 12, steps: "12 km at a conversational effort" },
  ],
};

export const lockedIds = new Set(["easy"]);

export function applyDates(plan, dates) {
  return {
    ...plan,
    workouts: plan.workouts.map(workout => dates[workout.id] ? { ...workout, date: dates[workout.id] } : workout),
  };
}

export function validSavedDates(plan, dates) {
  if (!dates || typeof dates !== "object" || Array.isArray(dates)) return false;
  const movable = plan.workouts.filter(workout => !lockedIds.has(workout.id));
  const allowed = ["2026-03-18", "2026-03-19", "2026-03-21", "2026-03-22"];
  return Object.entries(dates).every(([id, date]) =>
    movable.some(workout => workout.id === id) && allowed.includes(date)
  ) && new Set(movable.map(workout => dates[workout.id] ?? workout.date)).size === movable.length;
}
