# Transfer View + Change Log — Design Spec
_2026-06-06_

## Overview

Two additions to the existing Familienbudget app:

1. **"Zu überweisen" tab** — a read-only transfer summary table showing how much each person (Alex / Karin) needs to transfer each month, broken down by budget category.
2. **Change log** — tracks how long each budget version was active, displayed as "X Wochen seit letzter Änderung" badge in the header with an expandable history list.

---

## Navigation

`App.jsx` gains a `activeTab` state (`'budget' | 'transfer'`). Two tab buttons are added to `Header.jsx` below the title. The save button and change log badge remain visible on both tabs. The tab selection is not persisted (defaults to `'budget'` on load).

---

## Change Log

### DB Schema (new table)

```sql
CREATE TABLE budget_log (
  id SERIAL PRIMARY KEY,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT  -- how long the previous version was active; NULL for the first ever save
);
```

### Server behaviour on PUT /api/budget

Before upserting the budget row, the server:
1. Reads the current `updated_at` from the `budget` table (if it exists)
2. Computes `duration_seconds = EXTRACT(EPOCH FROM (now() - updated_at))::INT`
3. Inserts a row into `budget_log` with `saved_at = now()` and the computed duration
4. Proceeds with the budget upsert as before

### New API endpoint

`GET /api/budget/log` — returns the 20 most recent log entries, newest first:
```json
[
  { "id": 5, "saved_at": "2026-04-12T10:00:00Z", "duration_seconds": 1814400 },
  ...
]
```

### DB init

`initDb()` in `server/index.js` is extended to also `CREATE TABLE IF NOT EXISTS budget_log`.

### UI: Change Log Badge + Dropdown

Location: top-right of the header, alongside the save button.

**Badge** (always visible when `updated_at` is known):
```
● 3 Wochen seit letzter Änderung
```
- Computed from `lastSaved` state already available in `App.jsx`
- Format: whole weeks (round down). If < 1 week: "Weniger als 1 Woche".

**Dropdown** (toggled by clicking the badge):
- Loads from `GET /api/budget/log` on first open (lazy fetch)
- Shows up to 20 entries, each formatted as:
  ```
  12. Apr 2026  —  3 Wochen aktiv
  22. Mär 2026  —  5 Wochen aktiv
  ```
- Duration displayed as whole weeks (round down). If < 1 day: "Weniger als 1 Tag". If < 1 week: "X Tage aktiv".
- If no history yet: "Noch keine Einträge"
- Closes on click-outside or second click on badge

**New component:** `src/components/ChangeLogBadge.jsx`

---

## Transfer View ("Zu überweisen")

### Routing

When `activeTab === 'transfer'`, `App.jsx` renders `<TransferView budget={budget} />` instead of the full budget form. The view receives the current budget as a prop — no additional data fetching needed.

### Calculation logic (new pure function in utils.js)

```js
export function calcTransferRows(budget)
```

Returns an array of row objects:

```js
[
  { type: 'header', label: 'Fixkosten' },
  { type: 'row', label: 'Betriebskosten', alex: 45.00, karin: 55.00 },
  ...
  { type: 'header', label: 'Ausgaben' },
  { type: 'row', label: 'Mobilität', alex: 120.00, karin: 146.00 },
  { type: 'row', label: 'Emma', alex: 39.00, karin: 219.00 },  // special calc
  ...
  { type: 'header', label: 'Alex' },
  { type: 'row', label: 'Fonds', alex: 300.00, karin: null },
  { type: 'row', label: 'Handy', alex: 50.00, karin: null },
  ...
  { type: 'header', label: 'Karin' },
  { type: 'row', label: 'Spenden', alex: null, karin: 30.00 },
  ...
  { type: 'total', label: 'Gesamt', alex: 2172.00, karin: 2602.00 },
]
```

**Row construction:**

1. Header: `'Fixkosten'`
   - One row per `budget.fixedCosts` item: `alex = amount × alexRatio`, `karin = amount × karinRatio`

2. Header: `'Ausgaben'`
   - For each `budget.variableExpenses` item:
     - If `item.name === 'Emma'`: special calc — `alex = item.amount - income.emma`, `karin = income.emma`
     - All others: `alex = amount × alexRatio`, `karin = amount × karinRatio`

3. Header: `'Alex'`
   - Each item in `alex.investments`, `alex.individualCosts`, `alex.debtRepayment`: `alex = amount`, `karin = null`
   - Sections with zero items are omitted (no empty sub-headers)

4. Header: `'Karin'`
   - Same pattern: `karin = amount`, `alex = null`

5. Total row: sum of all non-null alex values / karin values

**Edge cases:**
- If `income.emma` > Emma item amount: Alex gets €0 (floor at 0), Karin gets `income.emma`
- Items with amount = 0 are included (shown as €0, not hidden)
- If a person section (investments/individualCosts/debtRepayment) is entirely empty, its header row is omitted

### UI: TransferView component

**New component:** `src/components/TransferView.jsx`

Layout: a single `Card` titled "Monatl. zu überweisen" containing a full-width table.

Table columns: **Kategorie | Alex | Karin**

Row types:
- `header`: grey section label spanning full row, no amounts
- `row`: label + two amount cells. `null` values render as `—`. Amounts formatted with `fmt()`.
- `total`: bold label + bold amounts, separated by a `Divider` above

Mobile: the table scrolls horizontally if needed. Column widths: Kategorie flexible, Alex/Karin fixed at ~100px each.

---

## File Changes

| File | Change |
|------|--------|
| `server/index.js` | `initDb()` creates `budget_log` table; `PUT /api/budget` inserts log row; new `GET /api/budget/log` endpoint |
| `src/api.js` | Add `getBudgetLog()` function |
| `src/utils.js` | Add `calcTransferRows(budget)` function |
| `src/utils.test.js` | Tests for `calcTransferRows` (shared split, Emma special case, individual items, total) |
| `src/App.jsx` | Add `activeTab` state; pass to Header; render TransferView or budget form conditionally |
| `src/components/Header.jsx` | Add tab buttons; accept `activeTab` + `onTabChange` props; render `ChangeLogBadge` |
| `src/components/ChangeLogBadge.jsx` | New: badge + dropdown |
| `src/components/TransferView.jsx` | New: transfer table |

---

## Error Handling

- `GET /api/budget/log` failure: badge still shows (from `lastSaved`), dropdown shows "Fehler beim Laden"
- Empty budget sections (no items): omit header row, no crash
- Division by zero (gesamtOhneEmma = 0): falls back to 0.5 ratio (same as `calcTotals`)
