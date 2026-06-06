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
