import { calcTotals, fmt } from '../utils.js'
import LineItemCard from './LineItemCard.jsx'
import { Card } from './IncomeCard.jsx'

export default function PersonSection({ name, person, income, budget, onChange }) {
  const t = calcTotals(budget)
  const bleiben = name === 'Alex' ? t.bleibenAlex : t.bleibenKarin
  const isPositive = bleiben >= 0

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
