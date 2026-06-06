import { describe, it, expect } from 'vitest'
import { calcTotals, fmt, pct, sumItems, defaultBudget, calcTransferRows } from './utils.js'

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

describe('sumItems', () => {
  it('sums item amounts', () => {
    expect(sumItems([{ id: '1', name: 'a', amount: 100 }, { id: '2', name: 'b', amount: 50 }])).toBe(150)
  })
  it('returns 0 for empty array', () => {
    expect(sumItems([])).toBe(0)
  })
  it('returns 0 for null/undefined input', () => {
    expect(sumItems(null)).toBe(0)
    expect(sumItems(undefined)).toBe(0)
  })
  it('coerces string amounts', () => {
    expect(sumItems([{ id: '1', name: 'a', amount: '42' }])).toBe(42)
  })
})

describe('defaultBudget', () => {
  it('returns correct structure', () => {
    const b = defaultBudget()
    expect(b).toHaveProperty('income')
    expect(b).toHaveProperty('fixedCosts')
    expect(b).toHaveProperty('variableExpenses')
    expect(b).toHaveProperty('alex.investments')
    expect(b).toHaveProperty('alex.individualCosts')
    expect(b).toHaveProperty('alex.debtRepayment')
    expect(b).toHaveProperty('karin.investments')
    expect(b).toHaveProperty('karin.individualCosts')
    expect(b).toHaveProperty('karin.debtRepayment')
  })
  it('pre-populates 14 fixed cost items', () => {
    const b = defaultBudget()
    expect(b.fixedCosts).toHaveLength(14)
  })
  it('each item has a non-empty id', () => {
    const b = defaultBudget()
    for (const item of b.fixedCosts) {
      expect(item.id).toBeTruthy()
    }
  })
})

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
