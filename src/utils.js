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
