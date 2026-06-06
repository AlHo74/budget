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
