# Familienbudget App — Design Spec
_2026-06-06_

## Overview

A single-page family budget planning web app replacing a Google Sheets budget. There is one living budget document (not month-by-month) — it gets updated whenever income or costs change. Stack matches the existing expenseshare app.

---

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Express (Node 22) + `pg`
- **DB:** PostgreSQL (single budget row, JSONB)
- **Auth:** Frontend password gate via `VITE_APP_PASSWORD` (same PasswordGate pattern as expenseshare)
- **Deployment:** Single Dockerfile, multi-stage build, PORT=3000
- **Env vars:** `DATABASE_URL`, `VITE_APP_PASSWORD`, `PORT=3000`

---

## Database Schema

```sql
CREATE TABLE budget (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

One row, always `id = 1`. Upserted on save.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budget` | Fetch budget document. Returns 404 if none exists yet. |
| PUT | `/api/budget` | Save full JSON document (upsert). Returns saved doc. |

Both endpoints return `{ data, updated_at }`.

---

## Data Model (JSON document stored in `data`)

```json
{
  "income": {
    "karin": 0,
    "alex": 0,
    "emma": 0
  },
  "fixedCosts": [
    { "id": "uuid", "name": "Betriebskosten", "amount": 0 }
  ],
  "variableExpenses": [
    { "id": "uuid", "name": "Mobilität", "amount": 0 }
  ],
  "alex": {
    "investments": [{ "id": "uuid", "name": "Fonds", "amount": 0 }],
    "individualCosts": [{ "id": "uuid", "name": "Handy", "amount": 0 }],
    "debtRepayment": [{ "id": "uuid", "name": "", "amount": 0 }]
  },
  "karin": {
    "investments": [{ "id": "uuid", "name": "Spenden", "amount": 0 }],
    "individualCosts": [{ "id": "uuid", "name": "Falter Abo", "amount": 0 }],
    "debtRepayment": [{ "id": "uuid", "name": "", "amount": 0 }]
  }
}
```

All calculated fields are derived at render time — never stored.

---

## Calculated Fields (all read-only, derived)

| Field | Formula |
|-------|---------|
| Gesamt Einkommen | Karin + Alex + Emma |
| Gesamt ohne Emma | Karin + Alex |
| AlexRatio | Alex / Gesamt ohne Emma |
| KarinRatio | Karin / Gesamt ohne Emma |
| Gesamt Fixkosten | sum(fixedCosts) |
| Gesamt Ausgaben | sum(variableExpenses) |
| Gesamt gemeinsame Kosten | Gesamt Fixkosten + Gesamt Ausgaben |
| Anteil Alex | Gesamt gemeinsame Kosten × AlexRatio |
| Anteil Karin | Gesamt gemeinsame Kosten × KarinRatio |
| Bleiben Alex | Alex income − Anteil Alex − sum(alex.investments + alex.individualCosts + alex.debtRepayment) |
| Bleiben Karin | Karin income − Anteil Karin − sum(karin.investments + karin.individualCosts + karin.debtRepayment) |

Percentages shown next to totals (e.g. "Gesamt Fixkosten: €1.200 / 38%") are relative to **Gesamt ohne Emma**.

---

## UI Layout

Dark glassmorphism: near-black background (`#0f0f1a`), cards with `backdrop-filter: blur`, semi-transparent white borders, white/light text.

### Page sections (top to bottom):

1. **Header** — app title "Familienbudget", last-saved timestamp, unsaved-changes indicator, global **Speichern** button
2. **Einkommen** card
   - Editable: Karin, Alex, Emma (amounts)
   - Read-only: Gesamt, Gesamt ohne Emma
   - Read-only: Split-Ratio display "Alex 52% / Karin 48%"
3. **Beide – Fixkosten** card
   - Editable line items (name + amount inline), + Add row button, delete row button
   - Footer: Gesamt Fixkosten + % of Gesamt ohne Emma
4. **Beide – Ausgaben** card — same structure
5. **Gemeinsame Kosten Summary** card (read-only)
   - Gesamt Fixkosten, Gesamt Ausgaben, Gesamt alle gemeinsamen Kosten
   - Anteil Alex, Anteil Karin
6. **Alex** section (two columns on desktop, stacked on mobile):
   - Investment card, Individuelle Kosten card, Schuldenabbau card
   - Each: editable line items + footer total
   - **Bleiben für Alex** highlighted card (green if positive, red if negative)
7. **Karin** section — same structure
8. **Mobile bottom bar** — sticky Speichern button (mirrors header)

### Inline editing behavior:
- Click any name or amount to edit in-place (contenteditable or input swap)
- Changes are local state only until Speichern is clicked
- Unsaved indicator (dot or "●  Nicht gespeichert") appears on any change
- On save: PUT /api/budget, indicator clears, timestamp updates

### Default line items (pre-populated on first load):

**Fixkosten:** Betriebskosten, Telekom, Krankenvers., Haftpflichtvers., Haushaltsvers., Unfallvers., Strom/Gas, Netflix, bunq, Amazon Prime, GIS, Garage, Sladja, Lastpass

**Ausgaben:** Mobilität, Haushalt, Emma, Restaurants

**Alex individual costs:** Handy, Gewand, Urlaub, Zahn, Kino

**Karin individual costs:** Spenden, Falter Abo, Lifestyle, Urlaub, Gesundheit, Weiterbildung

**Alex investments:** Fonds

**Karin investments:** (empty by default, + Add button)

**Schuldenabbau:** both empty by default

---

## Component Structure

```
src/
  main.jsx
  App.jsx               — fetch/save budget, global state
  api.js                — GET/PUT /api/budget
  utils.js              — calculations (pure functions)
  components/
    PasswordGate.jsx    — copied from expenseshare pattern
    Header.jsx          — title, save button, unsaved indicator
    IncomeCard.jsx      — income inputs + ratio display
    LineItemCard.jsx    — reusable: title + line items list + footer total
    PersonSection.jsx   — wraps Investment + IndividualCosts + DebtRepayment + Bleiben
    SummaryCard.jsx     — shared costs summary (read-only)
    MobileBottomBar.jsx — sticky save button on mobile
```

`LineItemCard` is the core reusable component used for Fixkosten, Ausgaben, and all individual sub-sections.

---

## File Structure

```
/
  src/
  server/
    index.js
  Dockerfile
  package.json
  vite.config.js
  index.html
```

Same layout as expenseshare.

---

## Error Handling

- On load failure: show error state with retry button
- On save failure: toast/banner "Speichern fehlgeschlagen", keep unsaved state
- If Gesamt ohne Emma = 0: show "—" for ratio/Anteil fields (avoid division by zero)

---

## Formatting

All currency values formatted as `de-DE` locale euros (e.g. `€ 1.234,56`) using `Intl.NumberFormat`. Same `fmt()` utility as expenseshare.
