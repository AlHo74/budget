import { fmt } from '../utils.js'

function IncomeInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</span>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="text-right w-32 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:ring-1"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}
        onFocus={e => e.target.select()}
      />
    </div>
  )
}

export default function IncomeCard({ income, onChange }) {
  const gesamtOhneEmma = (income.alex || 0) + (income.karin || 0)
  const gesamt = gesamtOhneEmma + (income.emma || 0)
  const alexRatio = gesamtOhneEmma > 0 ? Math.round((income.alex / gesamtOhneEmma) * 100) : 50
  const karinRatio = gesamtOhneEmma > 0 ? Math.round((income.karin / gesamtOhneEmma) * 100) : 50

  function set(field, val) {
    onChange({ ...income, [field]: val })
  }

  return (
    <Card title="Einkommen" accent="rgba(34,197,94,0.15)" borderAccent="rgba(34,197,94,0.25)">
      <IncomeInput label="Karin" value={income.karin} onChange={v => set('karin', v)} />
      <IncomeInput label="Alex" value={income.alex} onChange={v => set('alex', v)} />
      <IncomeInput label="Emma" value={income.emma} onChange={v => set('emma', v)} />

      <Divider />

      <ReadRow label="Gesamt" value={fmt(gesamt)} />
      <ReadRow label="Gesamt ohne Emma" value={fmt(gesamtOhneEmma)} />

      <Divider />

      <div className="flex items-center justify-between py-2">
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Split-Ratio</span>
        <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Alex {alexRatio}% / Karin {karinRatio}%
        </span>
      </div>
    </Card>
  )
}

export function Card({ title, children, accent, borderAccent }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: accent || 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${borderAccent || 'rgba(255,255,255,0.12)'}`,
      }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export function Divider() {
  return <div className="my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.09)' }} />
}

export function ReadRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <span
        className="font-medium"
        style={{ color: highlight ? '#86efac' : 'rgba(255,255,255,0.9)' }}
      >
        {value}
      </span>
    </div>
  )
}
