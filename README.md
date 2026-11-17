# RunIQ Plan showcase

[Try the mobile Plan demo](https://m47his.github.io/runiq-showcase/)

RunIQ is a mobile-first running coach. This showcase opens one fictional training week and lets you move a workout, review the schedule, and save it in your browser.

Open Thursday’s **5 × 600 m** session to see its warm-up, intervals and cool-down. Select **Move the interval session**, then **Swap** on Saturday. The two workouts exchange dates in the draft. Review both changes, save, then reload to see the saved week. **Reset demo** restores the original fixture.

- [Scheduler](docs/scheduler.mjs) — the date-only draft logic from RunIQ’s Plan screen, ported from TypeScript into browser-ready JavaScript. Past sessions, recorded outcomes, and planned breaks are protected, and moves stay in the same training week.
- [Tests](test/scheduler.test.mjs) — swaps, immutable prescriptions, date restrictions, undo, and saved draft validation.
- [Demo fixture](docs/fixture.mjs) — fictional training data and browser-local persistence helpers. The deployed RunIQ app also validates edits on its server.

## Run locally

Serve the static demo with Python 3.

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Open [localhost:8000](http://127.0.0.1:8000). Run the tests with Node.js 22 or later.

```sh
node --test
```
