import { calcTotals, fmt, pct } from '../utils.js'
import { Card, Divider, ReadRow } from './IncomeCard.jsx'

export default function SummaryCard({ budget }) {
  const t = calcTotals(budget)
  const gesamtFixkosten = t.gesamtFixkosten + t.gesamtAusgaben

  return (
    <Card title="Gemeinsame Kosten – Übersicht">
      <ReadRow label="Gesamt Fixkosten" value={`${fmt(gesamtFixkosten)} (${pct(gesamtFixkosten, t.gesamtOhneEmma)})`} />
      <Divider />
      <ReadRow label="Anteil Alex" value={`${fmt(t.anteilAlex)} (${pct(t.anteilAlex, t.gesamtOhneEmma)})`} />
      <ReadRow label="Anteil Karin" value={`${fmt(t.anteilKarin)} (${pct(t.anteilKarin, t.gesamtOhneEmma)})`} />
    </Card>
  )
}
