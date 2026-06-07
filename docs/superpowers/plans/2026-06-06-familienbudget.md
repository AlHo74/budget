# Familienbudget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a family budget planning web app (React + Vite + Tailwind v4 + Express + PostgreSQL) with a single living budget document, inline editing, glassmorphism dark UI, and frontend password protection.

**Architecture:** Greenfield single-repo app matching the expenseshare pattern exactly. Express serves the Vite build and a two-endpoint REST API. The entire budget is stored as a single JSONB document in PostgreSQL. All calculations are pure JS functions derived at render time.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Express 4, `pg`, PostgreSQL, Node 22, Dockerfile multi-stage build.

---

## File Map

| File | Responsibility |
|------|----------------|
| `package.json` | deps, scripts |
| `vite.config.js` | Vite + Tailwind plugin + dev proxy |
| `index.html` | HTML shell |
| `src/index.css` | `@import "tailwindcss"` + body styles |
| `src/main.jsx` | React root + PasswordGate wrapper |
| `src/App.jsx` | Global state, fetch/save, wire components |
| `src/api.js` | GET/PUT /api/budget |
| `src/utils.js` | Pure calculation functions + `fmt()` + default budget |
| `src/utils.test.js` | Vitest unit tests for calculations |
| `src/components/PasswordGate.jsx` | Frontend password gate |
| `src/components/Header.jsx` | Title, save button, unsaved indicator, last-saved |
| `src/components/IncomeCard.jsx` | Income inputs + ratio display |
| `src/components/LineItemCard.jsx` | Reusable: title + editable line items + footer total |
| `src/components/SummaryCard.jsx` | Read-only shared costs summary |
| `src/components/PersonSection.jsx` | Per-person investments/costs/debt + Bleiben |
| `src/components/MobileBottomBar.jsx` | Sticky save button for mobile |
| `server/index.js` | Express API + static serving |
| `Dockerfile` | Multi-stage build |

---

## Task 1: Scaffold project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/index.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "familienbudget",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node server/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.21.2",
    "pg": "^8.13.3",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.2",
    "@vitejs/plugin-react": "^6.0.1",
    "tailwindcss": "^4.2.2",
    "vite": "^8.0.1",
    "vitest": "^3.2.3"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd "Finanzen Schnubu"
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Familienbudget</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create src/index.css**

```css
@import "tailwindcss";

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f0f1a;
  color: #fff;
  min-height: 100vh;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
input[type="number"] { -moz-appearance: textfield; }
```

- [ ] **Step 6: Commit**

```bash
git init
git add package.json package-lock.json vite.config.js index.html src/index.css
git commit -m "feat: scaffold project"
```

---

## Task 2: Utils + tests (TDD)

**Files:**
- Create: `src/utils.js`
- Create: `src/utils.test.js`

- [ ] **Step 1: Write failing tests for calcTotals**

Create `src/utils.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { calcTotals, fmt, pct } from './utils.js'

const baseBudget = {
  income: { alex: 3000, karin: 2000, emma: 500 },
  fixedCosts: [
    { id: '1', name: 'Miete', amount: 800 },
    { id: '2', name: 'Strom', amount: 100 },
  ],
  variableExpenses: [
    { id: '3', name: 'Mobilität', amount: 200 },
  ],
  alex: {
    investments: [{ id: '4', name: 'Fonds', amount: 300 }],
    individualCosts: [{ id: '5', name: 'Handy', amount: 50 }],
    debtRepayment: [],
  },
  karin: {
    investments: [],
    individualCosts: [{ id: '6', name: 'Lifestyle', amount: 100 }],
    debtRepayment: [{ id: '7', name: 'Kredit', amount: 200 }],
  },
}

describe('calcTotals', () => {
  it('computes gesamtOhneEmma and gesamt', () => {
    const t = calcTotals(baseBudget)
    expect(t.gesamtOhneEmma).toBe(5000)
    expect(t.gesamt).toBe(5500)
  })

  it('computes income ratios', () => {
    const t = calcTotals(baseBudget)
    expect(t.alexRatio).toBeCloseTo(0.6)
    expect(t.karinRatio).toBeCloseTo(0.4)
  })

  it('computes shared cost totals', () => {
    const t = calcTotals(baseBudget)
    expect(t.gesamtFixkosten).toBe(900)
    expect(t.gesamtAusgaben).toBe(200)
    expect(t.gesamtGemeinsam).toBe(1100)
  })

  it('computes Anteil per person', () => {
    const t = calcTotals(baseBudget)
    expect(t.anteilAlex).toBeCloseTo(660)
    expect(t.anteilKarin).toBeCloseTo(440)
  })

  it('computes Bleiben per person', () => {
    const t = calcTotals(baseBudget)
    // alex: 3000 - 660 - (300 + 50) = 1990
    expect(t.bleibenAlex).toBeCloseTo(1990)
    // karin: 2000 - 440 - (0 + 100 + 200) = 1260
    expect(t.bleibenKarin).toBeCloseTo(1260)
  })

  it('returns 0.5 ratio when gesamtOhneEmma is 0', () => {
    const t = calcTotals({ ...baseBudget, income: { alex: 0, karin: 0, emma: 0 } })
    expect(t.alexRatio).toBe(0.5)
    expect(t.karinRatio).toBe(0.5)
  })
})

describe('fmt', () => {
  it('formats euros in de-DE locale', () => {
    expect(fmt(1234.56)).toBe('1.234,56 €')
  })
  it('formats zero', () => {
    expect(fmt(0)).toBe('0,00 €')
  })
})

describe('pct', () => {
  it('returns percentage string', () => {
    expect(pct(600, 5000)).toBe('12%')
  })
  it('returns — when total is 0', () => {
    expect(pct(100, 0)).toBe('—')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test
```

Expected: errors like "Cannot find module './utils.js'"

- [ ] **Step 3: Create src/utils.js**

```js
export function fmt(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount ?? 0)
}

export function pct(value, total) {
  if (!total) return '—'
  return `${Math.round((value / total) * 100)}%`
}

export function sumItems(items) {
  return (items ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0)
}

export function calcTotals(budget) {
  const { income, fixedCosts, variableExpenses, alex, karin } = budget

  const gesamtOhneEmma = (Number(income.alex) || 0) + (Number(income.karin) || 0)
  const gesamt = gesamtOhneEmma + (Number(income.emma) || 0)

  const alexRatio = gesamtOhneEmma > 0 ? (Number(income.alex) || 0) / gesamtOhneEmma : 0.5
  const karinRatio = gesamtOhneEmma > 0 ? (Number(income.karin) || 0) / gesamtOhneEmma : 0.5

  const gesamtFixkosten = sumItems(fixedCosts)
  const gesamtAusgaben = sumItems(variableExpenses)
  const gesamtGemeinsam = gesamtFixkosten + gesamtAusgaben

  const anteilAlex = gesamtGemeinsam * alexRatio
  const anteilKarin = gesamtGemeinsam * karinRatio

  const bleibenAlex =
    (Number(income.alex) || 0) -
    anteilAlex -
    sumItems(alex.investments) -
    sumItems(alex.individualCosts) -
    sumItems(alex.debtRepayment)

  const bleibenKarin =
    (Number(income.karin) || 0) -
    anteilKarin -
    sumItems(karin.investments) -
    sumItems(karin.individualCosts) -
    sumItems(karin.debtRepayment)

  return {
    gesamt,
    gesamtOhneEmma,
    alexRatio,
    karinRatio,
    gesamtFixkosten,
    gesamtAusgaben,
    gesamtGemeinsam,
    anteilAlex,
    anteilKarin,
    bleibenAlex,
    bleibenKarin,
  }
}

function uid() {
  return crypto.randomUUID()
}

function item(name, amount = 0) {
  return { id: uid(), name, amount }
}

export function defaultBudget() {
  return {
    income: { karin: 0, alex: 0, emma: 0 },
    fixedCosts: [
      item('Betriebskosten'),
      item('Telekom'),
      item('Krankenvers.'),
      item('Haftpflichtvers.'),
      item('Haushaltsvers.'),
      item('Unfallvers.'),
      item('Strom/Gas'),
      item('Netflix'),
      item('bunq'),
      item('Amazon Prime'),
      item('GIS'),
      item('Garage'),
      item('Sladja'),
      item('Lastpass'),
    ],
    variableExpenses: [
      item('Mobilität'),
      item('Haushalt'),
      item('Emma'),
      item('Restaurants'),
    ],
    alex: {
      investments: [item('Fonds')],
      individualCosts: [
        item('Handy'),
        item('Gewand'),
        item('Urlaub'),
        item('Zahn'),
        item('Kino'),
      ],
      debtRepayment: [],
    },
    karin: {
      investments: [],
      individualCosts: [
        item('Spenden'),
        item('Falter Abo'),
        item('Lifestyle'),
        item('Urlaub'),
        item('Gesundheit'),
        item('Weiterbildung'),
      ],
      debtRepayment: [],
    },
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test
```

Expected: all tests PASS. Fix any failures before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js src/utils.test.js
git commit -m "feat: add calculation utils with tests"
```

---

## Task 3: Server

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Create server/index.js**

```js
import express from 'express'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg
const app = express()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

app.use(express.json())

const __dirname = dirname(fileURLToPath(import.meta.url))
app.use(express.static(join(__dirname, '../dist')))

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `)
}

app.get('/api/budget', async (req, res) => {
  try {
    const result = await pool.query('SELECT data, updated_at FROM budget WHERE id = 1')
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/budget', async (req, res) => {
  const { data } = req.body
  if (!data) return res.status(400).json({ error: 'missing data' })
  try {
    const result = await pool.query(
      `INSERT INTO budget (id, data, updated_at) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()
       RETURNING data, updated_at`,
      [JSON.stringify(data)]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

const PORT = process.env.PORT || 3000
initDb()
  .then(() => app.listen(PORT, () => console.log(`Server running on :${PORT}`)))
  .catch(err => { console.error('DB init failed', err); process.exit(1) })
```

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: add Express API server"
```

---

## Task 4: API client

**Files:**
- Create: `src/api.js`

- [ ] **Step 1: Create src/api.js**

```js
export async function getBudget() {
  const res = await fetch('/api/budget')
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET /api/budget failed: ${res.status}`)
  return res.json()
}

export async function saveBudget(data) {
  const res = await fetch('/api/budget', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) throw new Error(`PUT /api/budget failed: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api.js
git commit -m "feat: add API client"
```

---

## Task 5: PasswordGate

**Files:**
- Create: `src/components/PasswordGate.jsx`

- [ ] **Step 1: Create src/components/PasswordGate.jsx**

```jsx
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'fb_auth'
const PASSWORD = import.meta.env.VITE_APP_PASSWORD

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') setUnlocked(true)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 2000)
    }
  }

  if (unlocked) return children

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0f0f1a' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 border"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <p className="text-3xl text-center mb-2">💰</p>
        <h1 className="text-xl font-bold text-white text-center mb-1">Familienbudget</h1>
        <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Bitte Passwort eingeben
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Passwort"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl text-white text-center text-lg tracking-widest focus:outline-none transition-colors ${
              error ? 'border-red-500' : 'border-white/10'
            }`}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
            }}
          />
          {error && (
            <p className="text-sm text-red-400 text-center">Falsches Passwort</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
            style={{ background: 'rgba(99,102,241,0.8)' }}
          >
            Weiter
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PasswordGate.jsx
git commit -m "feat: add PasswordGate component"
```

---

## Task 6: App.jsx — global state

**Files:**
- Create: `src/App.jsx`
- Create: `src/main.jsx`

- [ ] **Step 1: Create src/App.jsx**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { getBudget, saveBudget } from './api.js'
import { defaultBudget } from './utils.js'
import Header from './components/Header.jsx'
import IncomeCard from './components/IncomeCard.jsx'
import LineItemCard from './components/LineItemCard.jsx'
import SummaryCard from './components/SummaryCard.jsx'
import PersonSection from './components/PersonSection.jsx'
import MobileBottomBar from './components/MobileBottomBar.jsx'

export default function App() {
  const [budget, setBudget] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const result = await getBudget()
      if (result) {
        setBudget(result.data)
        setLastSaved(result.updated_at)
      } else {
        setBudget(defaultBudget())
      }
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function update(patch) {
    setBudget(prev => ({ ...prev, ...patch }))
    setDirty(true)
    setSaveError(null)
  }

  async function handleSave() {
    if (!budget) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await saveBudget(budget)
      setLastSaved(result.updated_at)
      setDirty(false)
    } catch (err) {
      setSaveError('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f1a' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: '#0f0f1a' }}>
        <p className="text-red-400">{loadError}</p>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg text-white"
          style={{ background: 'rgba(99,102,241,0.8)' }}
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: '#0f0f1a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Header
          dirty={dirty}
          saving={saving}
          saveError={saveError}
          lastSaved={lastSaved}
          onSave={handleSave}
        />

        <IncomeCard
          income={budget.income}
          onChange={income => update({ income })}
        />

        <LineItemCard
          title="Beide – Fixkosten"
          items={budget.fixedCosts}
          onChange={fixedCosts => update({ fixedCosts })}
          totalLabel="Gesamt Fixkosten"
          totalBase={budget.income.alex + budget.income.karin}
        />

        <LineItemCard
          title="Beide – Ausgaben"
          items={budget.variableExpenses}
          onChange={variableExpenses => update({ variableExpenses })}
          totalLabel="Gesamt Ausgaben"
          totalBase={budget.income.alex + budget.income.karin}
        />

        <SummaryCard budget={budget} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PersonSection
            name="Alex"
            person={budget.alex}
            income={budget.income.alex}
            budget={budget}
            onChange={alex => update({ alex })}
          />
          <PersonSection
            name="Karin"
            person={budget.karin}
            income={budget.income.karin}
            budget={budget}
            onChange={karin => update({ karin })}
          />
        </div>
      </div>

      <MobileBottomBar dirty={dirty} saving={saving} onSave={handleSave} />
    </div>
  )
}
```

- [ ] **Step 2: Create src/main.jsx**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PasswordGate from './components/PasswordGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </StrictMode>,
)
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/main.jsx
git commit -m "feat: add App state management"
```

---

## Task 7: Header component

**Files:**
- Create: `src/components/Header.jsx`

- [ ] **Step 1: Create src/components/Header.jsx**

```jsx
export default function Header({ dirty, saving, saveError, lastSaved, onSave }) {
  const savedAt = lastSaved
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastSaved))
    : null

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white">Familienbudget</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {saveError
            ? <span className="text-red-400">{saveError}</span>
            : savedAt
            ? `Gespeichert: ${savedAt}`
            : 'Noch nicht gespeichert'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {dirty && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.2)', color: '#facc15' }}>
            ● Nicht gespeichert
          </span>
        )}
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="px-5 py-2 rounded-xl font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: 'rgba(99,102,241,0.8)' }}
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat: add Header component"
```

---

## Task 8: IncomeCard

**Files:**
- Create: `src/components/IncomeCard.jsx`

- [ ] **Step 1: Create src/components/IncomeCard.jsx**

```jsx
import { fmt, pct } from '../utils.js'

function IncomeInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="text-right w-32 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:ring-1"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          focusRingColor: 'rgba(99,102,241,0.6)',
        }}
        onFocus={e => e.target.select()}
      />
    </div>
  )
}

export default function IncomeCard({ income, onChange }) {
  const gesamtOhneEmma = (income.alex || 0) + (income.karin || 0)
  const gesamt = gesamtOhneEmma + (income.emma || 0)
  const alexRatio = gesamtOhneEmma > 0 ? Math.round((income.alex / gesamtOhneEmma) * 100) : 50
  const karinRatio = gesamtOhneEmma > 0 ? Math.round((income.karin / gesamtOhneEmma) * 100) : 50

  function set(field, val) {
    onChange({ ...income, [field]: val })
  }

  return (
    <Card title="Einkommen">
      <IncomeInput label="Karin" value={income.karin} onChange={v => set('karin', v)} />
      <IncomeInput label="Alex" value={income.alex} onChange={v => set('alex', v)} />
      <IncomeInput label="Emma" value={income.emma} onChange={v => set('emma', v)} />

      <Divider />

      <ReadRow label="Gesamt" value={fmt(gesamt)} />
      <ReadRow label="Gesamt ohne Emma" value={fmt(gesamtOhneEmma)} />

      <Divider />

      <div className="flex items-center justify-between py-2">
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Split-Ratio</span>
        <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Alex {alexRatio}% / Karin {karinRatio}%
        </span>
      </div>
    </Card>
  )
}

export function Card({ title, children }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export function Divider() {
  return <div className="my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
}

export function ReadRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span
        className="font-medium"
        style={{ color: highlight ? '#a3e635' : 'rgba(255,255,255,0.8)' }}
      >
        {value}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/IncomeCard.jsx
git commit -m "feat: add IncomeCard and shared Card/ReadRow/Divider helpers"
```

---

## Task 9: LineItemCard (reusable)

**Files:**
- Create: `src/components/LineItemCard.jsx`

- [ ] **Step 1: Create src/components/LineItemCard.jsx**

```jsx
import { useState } from 'react'
import { fmt, pct, sumItems } from '../utils.js'
import { Card, Divider } from './IncomeCard.jsx'

function LineItem({ item, onChange, onDelete }) {
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal] = useState(item.name)

  function commitName() {
    setEditName(false)
    if (nameVal !== item.name) onChange({ ...item, name: nameVal })
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      {editName ? (
        <input
          autoFocus
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') commitName() }}
          className="flex-1 px-2 py-1 rounded-lg text-white text-sm focus:outline-none focus:ring-1"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(99,102,241,0.5)',
          }}
        />
      ) : (
        <span
          className="flex-1 text-sm cursor-pointer hover:text-white transition-colors"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          onClick={() => { setEditName(true); setNameVal(item.name) }}
        >
          {item.name || <span style={{ color: 'rgba(255,255,255,0.25)' }}>Name…</span>}
        </span>
      )}

      <input
        type="number"
        value={item.amount || ''}
        onChange={e => onChange({ ...item, amount: Number(e.target.value) || 0 })}
        placeholder="0"
        className="text-right w-24 px-2 py-1 rounded-lg text-white text-sm focus:outline-none focus:ring-1"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onFocus={e => e.target.select()}
      />

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
        style={{ color: 'rgba(255,100,100,0.7)' }}
        title="Entfernen"
      >
        ×
      </button>
    </div>
  )
}

export default function LineItemCard({ title, items, onChange, totalLabel, totalBase }) {
  function updateItem(id, updated) {
    onChange(items.map(i => i.id === id ? updated : i))
  }

  function deleteItem(id) {
    onChange(items.filter(i => i.id !== id))
  }

  function addItem() {
    onChange([...items, { id: crypto.randomUUID(), name: '', amount: 0 }])
  }

  const total = sumItems(items)

  return (
    <Card title={title}>
      {items.map(item => (
        <LineItem
          key={item.id}
          item={item}
          onChange={updated => updateItem(item.id, updated)}
          onDelete={() => deleteItem(item.id)}
        />
      ))}

      <button
        onClick={addItem}
        className="mt-2 text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
        style={{
          color: 'rgba(99,102,241,0.9)',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        + Hinzufügen
      </button>

      <Divider />

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{totalLabel}</span>
        <span className="font-semibold text-white">
          {fmt(total)}
          {totalBase > 0 && (
            <span className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {pct(total, totalBase)}
            </span>
          )}
        </span>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LineItemCard.jsx
git commit -m "feat: add LineItemCard reusable component"
```

---

## Task 10: SummaryCard

**Files:**
- Create: `src/components/SummaryCard.jsx`

- [ ] **Step 1: Create src/components/SummaryCard.jsx**

```jsx
import { calcTotals, fmt, pct } from '../utils.js'
import { Card, Divider, ReadRow } from './IncomeCard.jsx'

export default function SummaryCard({ budget }) {
  const t = calcTotals(budget)

  return (
    <Card title="Gemeinsame Kosten – Übersicht">
      <ReadRow label="Gesamt Fixkosten" value={`${fmt(t.gesamtFixkosten)} (${pct(t.gesamtFixkosten, t.gesamtOhneEmma)})`} />
      <ReadRow label="Gesamt Ausgaben" value={`${fmt(t.gesamtAusgaben)} (${pct(t.gesamtAusgaben, t.gesamtOhneEmma)})`} />
      <Divider />
      <ReadRow label="Gesamt gemeinsame Kosten" value={`${fmt(t.gesamtGemeinsam)} (${pct(t.gesamtGemeinsam, t.gesamtOhneEmma)})`} />
      <Divider />
      <ReadRow label="Anteil Alex" value={`${fmt(t.anteilAlex)} (${pct(t.anteilAlex, t.gesamtOhneEmma)})`} />
      <ReadRow label="Anteil Karin" value={`${fmt(t.anteilKarin)} (${pct(t.anteilKarin, t.gesamtOhneEmma)})`} />
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SummaryCard.jsx
git commit -m "feat: add SummaryCard component"
```

---

## Task 11: PersonSection

**Files:**
- Create: `src/components/PersonSection.jsx`

- [ ] **Step 1: Create src/components/PersonSection.jsx**

```jsx
import { calcTotals, fmt } from '../utils.js'
import LineItemCard from './LineItemCard.jsx'
import { Card } from './IncomeCard.jsx'

export default function PersonSection({ name, person, income, budget, onChange }) {
  const t = calcTotals(budget)
  const bleiben = name === 'Alex' ? t.bleibenAlex : t.bleibenKarin
  const isPositive = bleiben >= 0
  const personKey = name.toLowerCase()

  function updateSection(section, items) {
    onChange({ ...person, [section]: items })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white px-1">{name}</h2>

      <LineItemCard
        title="Investments"
        items={person.investments}
        onChange={items => updateSection('investments', items)}
        totalLabel="Gesamt"
        totalBase={income}
      />

      <LineItemCard
        title="Individuelle Kosten"
        items={person.individualCosts}
        onChange={items => updateSection('individualCosts', items)}
        totalLabel="Gesamt"
        totalBase={income}
      />

      <LineItemCard
        title="Schuldenabbau"
        items={person.debtRepayment}
        onChange={items => updateSection('debtRepayment', items)}
        totalLabel="Gesamt"
        totalBase={income}
      />

      <Card title={`Bleiben für ${name}`}>
        <div className="py-2 text-center">
          <span
            className="text-3xl font-bold"
            style={{ color: isPositive ? '#a3e635' : '#f87171' }}
          >
            {fmt(bleiben)}
          </span>
          {!isPositive && (
            <p className="text-xs mt-1" style={{ color: 'rgba(248,113,113,0.7)' }}>
              Ausgaben übersteigen Einkommen
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PersonSection.jsx
git commit -m "feat: add PersonSection component"
```

---

## Task 12: MobileBottomBar

**Files:**
- Create: `src/components/MobileBottomBar.jsx`

- [ ] **Step 1: Create src/components/MobileBottomBar.jsx**

```jsx
export default function MobileBottomBar({ dirty, saving, onSave }) {
  if (!dirty) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 p-4 md:hidden"
      style={{
        background: 'rgba(15,15,26,0.9)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 rounded-xl font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: 'rgba(99,102,241,0.85)' }}
      >
        {saving ? 'Speichern…' : '● Änderungen speichern'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileBottomBar.jsx
git commit -m "feat: add MobileBottomBar component"
```

---

## Task 13: Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
EXPOSE 3000
CMD ["node", "server/index.js"]
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
*.local
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile .gitignore
git commit -m "feat: add Dockerfile and .gitignore"
```

---

## Task 14: Dev smoke test

- [ ] **Step 1: Start a local PostgreSQL instance or point DATABASE_URL to an existing one**

You need a running Postgres. If testing locally via Docker:

```bash
docker run -d --name fb-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
```

- [ ] **Step 2: Start the Express server in one terminal**

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres node server/index.js
```

Expected output: `Server running on :3000`

- [ ] **Step 3: Start the Vite dev server in another terminal**

```bash
VITE_APP_PASSWORD=test npm run dev
```

Expected: Vite starts on `http://localhost:5173`, proxying `/api` to port 3000.

- [ ] **Step 4: Manual checks in browser**

Open `http://localhost:5173`:

1. Password gate appears → enter "test" → app loads
2. Income fields are editable — change Karin to 2000, Alex to 3000
3. Split ratio updates to "Alex 60% / Karin 40%"
4. Add a line item in Fixkosten — name and amount editable
5. Delete a line item
6. Summary card updates live
7. "Bleiben für Alex" and "Bleiben für Karin" update live
8. "Nicht gespeichert" indicator appears
9. Click Speichern — indicator clears, timestamp appears
10. Reload page — data persists

- [ ] **Step 5: Run unit tests one final time**

```bash
npm test
```

Expected: all PASS

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Familienbudget app"
```

---

## Task 15: Docker build verification

- [ ] **Step 1: Build the Docker image**

```bash
docker build -t familienbudget .
```

Expected: build completes with two stages, no errors.

- [ ] **Step 2: Run the container**

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/postgres \
  -e VITE_APP_PASSWORD=test \
  familienbudget
```

Expected: app loads on `http://localhost:3000`, password gate works, data persists.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: docker build adjustments" # only if changes were needed
```
