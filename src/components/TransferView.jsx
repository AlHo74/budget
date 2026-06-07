import { useState, useEffect } from 'react'
import { calcTransferRows, fmt } from '../utils.js'
import { Card } from './IncomeCard.jsx'
import { getExpenseShareBalance } from '../api.js'

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
  const amount = balance !== null ? fmt(Math.abs(balance)) : null

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 mb-5"
      style={{
        background: settled
          ? 'rgba(34,197,94,0.15)'
          : 'rgba(251,191,36,0.12)',
        border: `1px solid ${settled ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.28)'}`,
      }}
    >
      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
        FamilyShare
      </span>
      {balance === null ? (
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</span>
      ) : settled ? (
        <span className="text-sm font-bold" style={{ color: '#86efac' }}>Ausgeglichen ✓</span>
      ) : (
        <span className="text-sm font-bold" style={{ color: '#fde68a' }}>
          {debtor} schuldet {creditor} {amount}
        </span>
      )}
    </div>
  )
}

export default function TransferView({ budget }) {
  const rows = calcTransferRows(budget)

  return (
    <Card title="Monatl. zu überweisen">
      <ExpenseShareBadge />
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
