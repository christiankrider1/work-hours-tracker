# Work Hours Tracker

> Built with the assistance of AI tools — combining human direction with machine speed to ship a polished, practical app.

A simple bi-weekly work hours tracker with a pay period calendar. Clock in/out, track breaks, and see your totals at a glance.

## Features

- **Pay period calendar** — navigate bi-weekly pay periods anchored to your actual schedule
- **Clock In / Clock Out** — real-time capture with one click, or use the dropdowns for manual entry
- **Break tracking** — Break Out / Break In buttons or manual dropdowns (optional, no break subtracted unless both start and end are filled)
- **Per-week overtime** — hours over 40 in a single week are calculated as overtime, displayed as both h:m and decimal
- **Details modal** — day-by-day breakdown table for the current pay period with weekly subtotals and inline overtime
- **Toast notifications** — subtle slide-in confirmations for clock in/out, break in/out, save, and delete actions
- **Color-coded grid** — today is blue, empty days are dimmed, weekends are styled differently
- **Persistent storage** — all data saved to `localStorage`, survives page reloads

## How to use

1. Open `index.html` in any modern browser (no server required, no build step)
2. Use the **<** / **>** arrows to navigate between pay periods
3. Click a day cell to open the detail modal
4. Click **Clock In** to capture the current time, or set the dropdowns manually
5. Use **Break Out** / **Break In** to track breaks, or set the break dropdowns manually
6. Hit **Save** — a toast confirms the entry was saved
7. Click **Details** to see the full per-day breakdown with weekly subtotals
8. The summary bar at the bottom updates automatically with logged hours, decimal, days, overtime, and remaining

## Tech

Vanilla HTML / CSS / JavaScript — zero dependencies, no build step, no frameworks.
