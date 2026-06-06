import { describe, it, expect } from 'vitest'
import { calcTotals, fmt, pct, sumItems, defaultBudget } from './utils.js'

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
