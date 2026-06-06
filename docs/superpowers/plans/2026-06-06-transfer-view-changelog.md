# Transfer View + Change Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Zu überweisen" transfer summary tab and a "X Wochen seit letzter Änderung" change log badge with history to the existing Familienbudget app.

**Architecture:** Seven focused changes to the existing codebase — server gets a new `budget_log` table and two new route changes; a new pure function `calcTransferRows` in utils.js powers the read-only transfer table; three new components handle the tab UI, transfer table, and changelog badge; `App.jsx` and `Header.jsx` are extended minimally.

**Tech Stack:** Same as existing app — React 19, Vite, Tailwind v4, Express, pg, vitest.

---

## File Map

| File | Change |
|------|--------|
| `server/index.js` | Extend `initDb()` for `budget_log`; update `PUT /api/budget` to log duration; add `GET /api/budget/log` |
| `src/api.js` | Add `getBudgetLog()` |
| `src/utils.js` | Add `calcTransferRows(budget)` |
| `src/utils.test.js` | Add 8 tests for `calcTransferRows` |
| `src/App.jsx` | Add `activeTab` state; conditionally render TransferView or budget form |
| `src/components/Header.jsx` | Add tab buttons + `ChangeLogBadge`; accept `activeTab` / `onTabChange` props |
| `src/components/ChangeLogBadge.jsx` | New: badge + expandable history dropdown |
| `src/components/TransferView.jsx` | New: read-only transfer summary table |

---

## Task 1: Server — budget_log table + logging + new endpoint

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Replace server/index.js with the updated version**

The changes are: (a) `initDb()` creates `budget_log` table, (b) `PUT /api/budget` logs duration before upserting, (c) new `GET /api/budget/log` endpoint inserted before the SPA fallback.

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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_log (
      id SERIAL PRIMARY KEY,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      duration_seconds INT
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
  if (!data || typeof data !== 'object' || !data.income) return res.status(400).json({ error: 'invalid data' })
  try {
    const current = await pool.query('SELECT updated_at FROM budget WHERE id = 1')
    if (current.rows.length > 0) {
      const dur = await pool.query(
        `SELECT EXTRACT(EPOCH FROM (now() - $1))::INT AS secs`,
        [current.rows[0].updated_at]
      )
      await pool.query(
        'INSERT INTO budget_log (saved_at, duration_seconds) VALUES (now(), $1)',
        [dur.rows[0].secs]
      )
    } else {
      await pool.query('INSERT INTO budget_log (saved_at, duration_seconds) VALUES (now(), NULL)')
    }
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

app.get('/api/budget/log', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, saved_at, duration_seconds FROM budget_log ORDER BY saved_at DESC LIMIT 20'
    )
    res.json(result.rows)
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
git commit -m "feat: add budget_log table, save duration on PUT, GET /api/budget/log"
```

---

## Task 2: API client — getBudgetLog

**Files:**
- Modify: `src/api.js`

- [ ] **Step 1: Add getBudgetLog to src/api.js**

Append to the existing file (keep getBudget and saveBudget unchanged):

```js
export async function getBudgetLog() {
  const res = await fetch('/api/budget/log')
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GET /api/budget/log failed: ${res.status} — ${body}`)
  }
  return res.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api.js
git commit -m "feat: add getBudgetLog API function"
```

---

## Task 3: calcTransferRows — TDD

**Files:**
- Modify: `src/utils.js`
- Modify: `src/utils.test.js`

- [ ] **Step 1: Write failing tests — append to src/utils.test.js**

First update the import line at the top of the file from:
```js
import { calcTotals, fmt, pct, sumItems, defaultBudget } from './utils.js'
```
to:
```js
import { calcTotals, fmt, pct, sumItems, defaultBudget, calcTransferRows } from './utils.js'
```

Then append this describe block at the end of the file:

```js
describe('calcTransferRows', () => {
  const budget = {
    income: { alex: 3000, karin: 2000, emma: 219 },
    fixedCosts: [{ id: '1', name: 'Betriebskosten', amount: 500 }],
    variableExpenses: [
      { id: '2', name: 'Mobilität', amount: 200 },
      { id: '3', name: 'Emma', amount: 258 },
    ],
    alex: {
      investments: [{ id: '4', name: 'Fonds', amount: 300 }],
      individualCosts: [{ id: '5', name: 'Handy', amount: 50 }],
      debtRepayment: [],
    },
    karin: {
      investments: [],
      individualCosts: [{ id: '6', name: 'Lifestyle', amount: 100 }],
      debtRepayment: [],
    },
  }

  it('produces header rows for each non-empty section', () => {
    const rows = calcTransferRows(budget)
    const headers = rows.filter(r => r.type === 'header').map(r => r.label)
    expect(headers).toEqual(['Fixkosten', 'Ausgaben', 'Alex', 'Karin'])
  })

  it('splits fixed costs by income ratio', () => {
    const rows = calcTransferRows(budget)
    const row = rows.find(r => r.label === 'Betriebskosten')
    // alexRatio = 3000/5000 = 0.6, karinRatio = 0.4
    expect(row.alex).toBeCloseTo(300)
    expect(row.karin).toBeCloseTo(200)
  })

  it('applies special Emma calculation', () => {
    const rows = calcTransferRows(budget)
    const emma = rows.find(r => r.label === 'Emma')
    // alex = 258 - 219 = 39, karin = 219 (Familienbeihilfe)
    expect(emma.alex).toBeCloseTo(39)
    expect(emma.karin).toBeCloseTo(219)
  })

  it('floors alex Emma share at 0 when Familienbeihilfe exceeds costs', () => {
    const b = { ...budget, income: { ...budget.income, emma: 300 } }
    const rows = calcTransferRows(b)
    const emma = rows.find(r => r.label === 'Emma')
    expect(emma.alex).toBe(0)
    expect(emma.karin).toBe(300)
  })

  it('puts Alex individual items in alex column with karin=null', () => {
    const rows = calcTransferRows(budget)
    const fonds = rows.find(r => r.label === 'Fonds')
    expect(fonds.alex).toBe(300)
    expect(fonds.karin).toBeNull()
  })

  it('puts Karin individual items in karin column with alex=null', () => {
    const rows = calcTransferRows(budget)
    const lifestyle = rows.find(r => r.label === 'Lifestyle')
    expect(lifestyle.alex).toBeNull()
    expect(lifestyle.karin).toBe(100)
  })

  it('computes correct totals', () => {
    const rows = calcTransferRows(budget)
    const total = rows.find(r => r.type === 'total')
    // alex: 300 (Betriebskosten×0.6) + 120 (Mobilität×0.6) + 39 (Emma) + 300 (Fonds) + 50 (Handy) = 809
    expect(total.alex).toBeCloseTo(809)
    // karin: 200 (Betriebskosten×0.4) + 80 (Mobilität×0.4) + 219 (Emma) + 100 (Lifestyle) = 599
    expect(total.karin).toBeCloseTo(599)
  })

  it('omits section header when all items in that section are empty', () => {
    const b = { ...budget, alex: { investments: [], individualCosts: [], debtRepayment: [] } }
    const rows = calcTransferRows(b)
    const headers = rows.filter(r => r.type === 'header').map(r => r.label)
    expect(headers).not.toContain('Alex')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test
```

Expected: "calcTransferRows is not a function" or similar import error.

- [ ] **Step 3: Implement calcTransferRows — append to src/utils.js**

```js
export function calcTransferRows(budget) {
  const { income, fixedCosts, variableExpenses, alex, karin } = budget

  const gesamtOhneEmma = (Number(income.alex) || 0) + (Number(income.karin) || 0)
  const alexRatio = gesamtOhneEmma > 0 ? (Number(income.alex) || 0) / gesamtOhneEmma : 0.5
  const karinRatio = gesamtOhneEmma > 0 ? (Number(income.karin) || 0) / gesamtOhneEmma : 0.5

  const rows = []

  // Fixkosten
  if (fixedCosts.length > 0) {
    rows.push({ type: 'header', label: 'Fixkosten' })
    for (const item of fixedCosts) {
      const amt = Number(item.amount) || 0
      rows.push({ type: 'row', label: item.name, alex: amt * alexRatio, karin: amt * karinRatio })
    }
  }

  // Ausgaben
  if (variableExpenses.length > 0) {
    rows.push({ type: 'header', label: 'Ausgaben' })
    for (const item of variableExpenses) {
      const amt = Number(item.amount) || 0
      if (item.name === 'Emma') {
        const familienbeihilfe = Number(income.emma) || 0
        rows.push({ type: 'row', label: item.name, alex: Math.max(0, amt - familienbeihilfe), karin: familienbeihilfe })
      } else {
        rows.push({ type: 'row', label: item.name, alex: amt * alexRatio, karin: amt * karinRatio })
      }
    }
  }

  // Alex individual sections
  const alexItems = [
    ...(alex.investments ?? []),
    ...(alex.individualCosts ?? []),
    ...(alex.debtRepayment ?? []),
  ]
  if (alexItems.length > 0) {
    rows.push({ type: 'header', label: 'Alex' })
    for (const item of alexItems) {
      rows.push({ type: 'row', label: item.name, alex: Number(item.amount) || 0, karin: null })
    }
  }

  // Karin individual sections
  const karinItems = [
    ...(karin.investments ?? []),
    ...(karin.individualCosts ?? []),
    ...(karin.debtRepayment ?? []),
  ]
  if (karinItems.length > 0) {
    rows.push({ type: 'header', label: 'Karin' })
    for (const item of karinItems) {
      rows.push({ type: 'row', label: item.name, alex: null, karin: Number(item.amount) || 0 })
    }
  }

  // Total
  const totalAlex = rows
    .filter(r => r.type === 'row' && r.alex !== null)
    .reduce((s, r) => s + r.alex, 0)
  const totalKarin = rows
    .filter(r => r.type === 'row' && r.karin !== null)
    .reduce((s, r) => s + r.karin, 0)
  rows.push({ type: 'total', label: 'Gesamt', alex: totalAlex, karin: totalKarin })

  return rows
}
```

- [ ] **Step 4: Run tests — expect all 25 pass**

```bash
npm test
```

Expected: all tests PASS (17 existing + 8 new = 25). Fix any failures before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/utils.js src/utils.test.js
git commit -m "feat: add calcTransferRows with tests"
```

---

## Task 4: ChangeLogBadge component

**Files:**
- Create: `src/components/ChangeLogBadge.jsx`

- [ ] **Step 1: Create src/components/ChangeLogBadge.jsx**

```jsx
import { useState, useEffect } from 'react'
import { getBudgetLog } from '../api.js'

function weeksAgo(isoString) {
  if (!isoString) return null
  const diff = Date.now() - new Date(isoString).getTime()
  return Math.floor(diff / (7 * 24 * 3600 * 1000))
}

function formatDuration(seconds) {
  if (seconds == null) return '—'
  const days = Math.floor(seconds / 86400)
  const weeks = Math.floor(days / 7)
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} aktiv`
  if (days >= 1) return `${days} ${days === 1 ? 'Tag' : 'Tage'} aktiv`
  return 'Weniger als 1 Tag aktiv'
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(isoString))
}

export default function ChangeLogBadge({ lastSaved }) {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState(null)
  const [logError, setLogError] = useState(null)

  const weeks = weeksAgo(lastSaved)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!e.target.closest('[data-changelog]')) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleToggle() {
    if (!open && log === null) {
      try {
        setLogError(null)
        const data = await getBudgetLog()
        setLog(data)
      } catch {
        setLogError('Fehler beim Laden')
      }
    }
    setOpen(o => !o)
  }

  if (weeks === null) return null

  const label = weeks === 0
    ? 'Weniger als 1 Woche'
    : `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`

  return (
    <div className="relative" data-changelog="">
      <button
        onClick={handleToggle}
        className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
      >
        ● {label} seit letzter Änderung
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-10 w-64 rounded-xl p-4 shadow-xl"
          style={{
            background: 'rgba(20,20,35,0.97)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            Änderungshistorie
          </p>
          {logError && <p className="text-xs text-red-400">{logError}</p>}
          {!logError && log === null && (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</p>
          )}
          {log && log.length === 0 && (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Noch keine Einträge</p>
          )}
          {log && log.map(entry => (
            <div
              key={entry.id}
              className="flex justify-between text-xs py-1.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{formatDate(entry.saved_at)}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDuration(entry.duration_seconds)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChangeLogBadge.jsx
git commit -m "feat: add ChangeLogBadge component"
```

---

## Task 5: TransferView component

**Files:**
- Create: `src/components/TransferView.jsx`

- [ ] **Step 1: Create src/components/TransferView.jsx**

```jsx
import { calcTransferRows, fmt } from '../utils.js'
import { Card } from './IncomeCard.jsx'

export default function TransferView({ budget }) {
  const rows = calcTransferRows(budget)

  return (
    <Card title="Monatl. zu überweisen">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left pb-3 font-medium" style={{ color: 'rgba(255,255,255,0.45)', width: '56%' }}>
                Kategorie
              </th>
              <th className="text-right pb-3 font-medium" style={{ color: 'rgba(255,255,255,0.45)', width: '22%' }}>
                Alex
              </th>
              <th className="text-right pb-3 font-medium" style={{ color: 'rgba(255,255,255,0.45)', width: '22%' }}>
                Karin
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              if (row.type === 'header') {
                return (
                  <tr key={i}>
                    <td
                      colSpan={3}
                      className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {row.label}
                    </td>
                  </tr>
                )
              }

              if (row.type === 'total') {
                return (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <td className="pt-3 pb-1 font-bold text-white">{row.label}</td>
                    <td className="pt-3 pb-1 text-right font-bold text-white">{fmt(row.alex)}</td>
                    <td className="pt-3 pb-1 text-right font-bold text-white">{fmt(row.karin)}</td>
                  </tr>
                )
              }

              return (
                <tr key={i} className="hover:bg-white/5 transition-colors rounded">
                  <td className="py-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {row.label || '—'}
                  </td>
                  <td className="py-1.5 text-right" style={{ color: row.alex !== null ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }}>
                    {row.alex !== null ? fmt(row.alex) : '—'}
                  </td>
                  <td className="py-1.5 text-right" style={{ color: row.karin !== null ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }}>
                    {row.karin !== null ? fmt(row.karin) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TransferView.jsx
git commit -m "feat: add TransferView component"
```

---

## Task 6: Header — tabs + ChangeLogBadge

**Files:**
- Modify: `src/components/Header.jsx`

- [ ] **Step 1: Replace src/components/Header.jsx**

```jsx
import ChangeLogBadge from './ChangeLogBadge.jsx'

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={
        active
          ? { background: 'rgba(99,102,241,0.8)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
      }
    >
      {children}
    </button>
  )
}

export default function Header({ dirty, saving, saveError, lastSaved, onSave, activeTab, onTabChange }) {
  const savedAt = lastSaved
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastSaved))
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
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

        <div className="flex items-center gap-3 flex-wrap">
          <ChangeLogBadge lastSaved={lastSaved} />
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

      <div className="flex gap-2">
        <TabButton active={activeTab === 'budget'} onClick={() => onTabChange('budget')}>
          Budget
        </TabButton>
        <TabButton active={activeTab === 'transfer'} onClick={() => onTabChange('transfer')}>
          Zu überweisen
        </TabButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat: add tab navigation and ChangeLogBadge to Header"
```

---

## Task 7: App.jsx — tab state + conditional render

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace src/App.jsx**

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
import TransferView from './components/TransferView.jsx'

export default function App() {
  const [budget, setBudget] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setActiveTab] = useState('budget')

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
    <div className="min-h-screen pb-6" style={{ background: '#0f0f1a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Header
          dirty={dirty}
          saving={saving}
          saveError={saveError}
          lastSaved={lastSaved}
          onSave={handleSave}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === 'transfer' ? (
          <TransferView budget={budget} />
        ) : (
          <>
            <IncomeCard
              income={budget.income}
              onChange={income => update({ income })}
            />

            <LineItemCard
              title="Beide – Fixkosten"
              items={budget.fixedCosts}
              onChange={fixedCosts => update({ fixedCosts })}
              totalLabel="Gesamt Fixkosten"
              totalBase={(Number(budget.income.alex) || 0) + (Number(budget.income.karin) || 0)}
            />

            <LineItemCard
              title="Beide – Ausgaben"
              items={budget.variableExpenses}
              onChange={variableExpenses => update({ variableExpenses })}
              totalLabel="Gesamt Ausgaben"
              totalBase={(Number(budget.income.alex) || 0) + (Number(budget.income.karin) || 0)}
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
          </>
        )}
      </div>

      <MobileBottomBar dirty={dirty} saving={saving} onSave={handleSave} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add tab state and TransferView routing to App"
```

---

## Task 8: Build verification

**Files:** none

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: 25 tests pass (17 existing + 8 new calcTransferRows tests).

- [ ] **Step 2: Run Vite build**

```bash
npm run build
```

Expected: build succeeds with no errors. Fix any import or JSX errors before proceeding.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: build errors" # only if changes were made
```
