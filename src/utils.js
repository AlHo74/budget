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

export function calcTransferRows(budget) {
  const { income, fixedCosts, variableExpenses, alex, karin } = budget

  const gesamtOhneEmma = (Number(income.alex) || 0) + (Number(income.karin) || 0)
  const alexRatio = gesamtOhneEmma > 0 ? (Number(income.alex) || 0) / gesamtOhneEmma : 0.5
  const karinRatio = gesamtOhneEmma > 0 ? (Number(income.karin) || 0) / gesamtOhneEmma : 0.5

  const rows = []

  if (fixedCosts.length > 0) {
    rows.push({ type: 'header', label: 'Fixkosten' })
    for (const item of fixedCosts) {
      const amt = Number(item.amount) || 0
      rows.push({ type: 'row', label: item.name, alex: amt * alexRatio, karin: amt * karinRatio })
    }
  }

  if (variableExpenses.length > 0) {
    rows.push({ type: 'header', label: 'Ausgaben' })
    for (const item of variableExpenses) {
      const amt = Number(item.amount) || 0
      // Item named exactly 'Emma' uses Familienbeihilfe (income.emma) to offset Karin's share.
      // Renaming this item will silently disable the offset.
      if (item.name === 'Emma') {
        const familienbeihilfe = Number(income.emma) || 0
        rows.push({ type: 'row', label: item.name, alex: Math.max(0, amt - familienbeihilfe), karin: familienbeihilfe })
      } else {
        rows.push({ type: 'row', label: item.name, alex: amt * alexRatio, karin: amt * karinRatio })
      }
    }
  }

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

  const totalAlex = rows
    .filter(r => r.type === 'row' && r.alex !== null)
    .reduce((s, r) => s + r.alex, 0)
  const totalKarin = rows
    .filter(r => r.type === 'row' && r.karin !== null)
    .reduce((s, r) => s + r.karin, 0)
  rows.push({ type: 'total', label: 'Gesamt', alex: totalAlex, karin: totalKarin })

  return rows
}
