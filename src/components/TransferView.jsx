import { useState, useEffect } from 'react'
import { fmt } from '../utils.js'
import { Card } from './IncomeCard.jsx'
import { getExpenseShareBalance } from '../api.js'

// ── helpers ──────────────────────────────────────────────────────────────────

function ratios(income) {
  const total = (Number(income.alex) || 0) + (Number(income.karin) || 0)
  const alexR = total > 0 ? (Number(income.alex) || 0) / total : 0.5
  return { alexR, karinR: 1 - alexR }
}

function sumAmounts(items) {
  return items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
}

// ── sub-components ────────────────────────────────────────────────────────────

function ColHeader() {
  return (
    <div className="flex justify-between text-xs font-semibold uppercase tracking-wider pb-2 mb-1"
      style={{ color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="flex-1">Kategorie</span>
      <span className="w-24 text-right">Alex</span>
      <span className="w-24 text-right">Karin</span>
    </div>
  )
}

function Row({ label, alex, karin }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 text-sm">
      <span className="flex-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</span>
      <span className="w-24 text-right" style={{ color: alex != null ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)' }}>
        {alex != null ? fmt(alex) : '—'}
      </span>
      <span className="w-24 text-right" style={{ color: karin != null ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)' }}>
        {karin != null ? fmt(karin) : '—'}
      </span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mt-3 mb-1"
      style={{ color: 'rgba(255,255,255,0.35)' }}>
      {children}
    </p>
  )
}

function SubtotalRow({ alexTotal, karinTotal }) {
  return (
    <div className="flex justify-between items-baseline pt-2 mt-1 text-sm font-semibold"
      style={{ borderTop: '1px solid rgba(255,255,255,0.09)' }}>
      <span className="flex-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Zwischensumme</span>
      <span className="w-24 text-right text-white">{fmt(alexTotal)}</span>
      <span className="w-24 text-right text-white">{fmt(karinTotal)}</span>
    </div>
  )
}

// ── FamilyShare badge ─────────────────────────────────────────────────────────

function ExpenseShareBadge() {
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getExpenseShareBalance()
      .then(data => setBalance(data.balance))
      .catch(() => setError(true))
  }, [])

  if (error) return null

  const settled = balance !== null && Math.abs(balance) < 0.01
  const debtor = balance > 0 ? 'Karin' : 'Alex'
  const creditor = balance > 0 ? 'Alex' : 'Karin'

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 mb-6"
      style={{
        background: settled ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.12)',
        border: `1px solid ${settled ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.28)'}`,
      }}
    >
      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>FamilyShare</span>
      {balance === null ? (
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</span>
      ) : settled ? (
        <span className="text-sm font-bold" style={{ color: '#86efac' }}>Ausgeglichen ✓</span>
      ) : (
        <span className="text-sm font-bold" style={{ color: '#fde68a' }}>
          {debtor} schuldet {creditor} {fmt(Math.abs(balance))}
        </span>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function TransferView({ budget }) {
  const { income, fixedCosts, variableExpenses, alex, karin } = budget
  const { alexR, karinR } = ratios(income)
  const emma = Number(income.emma) || 0

  // ── Left column: Fixkosten (sum) + Ausgaben (per item) ──
  const fixedTotal = sumAmounts(fixedCosts)
  const fixedAlex = fixedTotal * alexR
  const fixedKarin = fixedTotal * karinR

  const ausgabenRows = variableExpenses.map(item => {
    const amt = Number(item.amount) || 0
    if (item.name === 'Emma') {
      return { label: item.name, alex: Math.max(0, amt - emma), karin: emma }
    }
    return { label: item.name, alex: amt * alexR, karin: amt * karinR }
  })

  const leftAlexTotal = fixedAlex + ausgabenRows.reduce((s, r) => s + r.alex, 0)
  const leftKarinTotal = fixedKarin + ausgabenRows.reduce((s, r) => s + r.karin, 0)

  // ── Right column: Alex personal + Karin personal ──
  const alexItems = [
    ...(alex.investments ?? []),
    ...(alex.individualCosts ?? []),
    ...(alex.debtRepayment ?? []),
  ]
  const karinItems = [
    ...(karin.investments ?? []),
    ...(karin.individualCosts ?? []),
    ...(karin.debtRepayment ?? []),
  ]

  const rightAlexTotal = sumAmounts(alexItems)
  const rightKarinTotal = sumAmounts(karinItems)

  // ── Grand totals ──
  const grandAlex = leftAlexTotal + rightAlexTotal
  const grandKarin = leftKarinTotal + rightKarinTotal

  return (
    <div className="space-y-6">
      <ExpenseShareBadge />

      {/* Two-column: shared costs | individual costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left: Fixkosten + Ausgaben */}
        <Card title="Gemeinsame Kosten">
          <ColHeader />
          <Row label="Fixkosten" alex={fixedAlex} karin={fixedKarin} />
          {ausgabenRows.length > 0 && (
            <>
              <SectionLabel>Ausgaben</SectionLabel>
              {ausgabenRows.map((r, i) => (
                <Row key={i} label={r.label} alex={r.alex} karin={r.karin} />
              ))}
            </>
          )}
          <SubtotalRow alexTotal={leftAlexTotal} karinTotal={leftKarinTotal} />
        </Card>

        {/* Right: Alex + Karin personal */}
        <Card title="Persönliche Kosten">
          <ColHeader />
          {alexItems.length > 0 && (
            <>
              <SectionLabel>Alex</SectionLabel>
              {alexItems.map(item => (
                <Row key={item.id} label={item.name} alex={Number(item.amount) || 0} karin={null} />
              ))}
            </>
          )}
          {karinItems.length > 0 && (
            <>
              <SectionLabel>Karin</SectionLabel>
              {karinItems.map(item => (
                <Row key={item.id} label={item.name} alex={null} karin={Number(item.amount) || 0} />
              ))}
            </>
          )}
          <SubtotalRow alexTotal={rightAlexTotal} karinTotal={rightKarinTotal} />
        </Card>
      </div>

      {/* Full-width grand total */}
      <Card title="Gesamt zu überweisen">
        <div className="flex justify-between items-center gap-6">
          <div className="flex-1 rounded-xl px-5 py-4 text-center"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgba(255,255,255,0.45)' }}>Alex</p>
            <p className="text-2xl font-bold text-white">{fmt(grandAlex)}</p>
          </div>
          <div className="flex-1 rounded-xl px-5 py-4 text-center"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgba(255,255,255,0.45)' }}>Karin</p>
            <p className="text-2xl font-bold text-white">{fmt(grandKarin)}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
