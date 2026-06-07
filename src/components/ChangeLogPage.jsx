import { useState, useEffect } from 'react'
import { getBudgetLog } from '../api.js'
import { Card } from './IncomeCard.jsx'
import { fmt } from '../utils.js'

// ── formatting helpers ────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (seconds == null) return null
  const days = Math.floor(seconds / 86400)
  const weeks = Math.floor(days / 7)
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} aktiv`
  if (days >= 1) return `${days} ${days === 1 ? 'Tag' : 'Tage'} aktiv`
  return 'Weniger als 1 Tag aktiv'
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(isoString))
}

function formatTime(isoString) {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoString))
}

// ── snapshot calculations ─────────────────────────────────────────────────────

function calcSnapshot(snapshot) {
  if (!snapshot) return null
  const { income, fixedCosts = [], variableExpenses = [], alex = {}, karin = {} } = snapshot

  const alexIncome = Number(income?.alex) || 0
  const karinIncome = Number(income?.karin) || 0
  const emmaIncome = Number(income?.emma) || 0
  const total = alexIncome + karinIncome
  const alexR = total > 0 ? alexIncome / total : 0.5
  const karinR = 1 - alexR

  const fixedTotal = fixedCosts.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const ausgabenRows = variableExpenses.map(item => {
    const amt = Number(item.amount) || 0
    if (item.name === 'Emma') {
      return { label: item.name, alex: Math.max(0, amt - emmaIncome), karin: emmaIncome }
    }
    return { label: item.name, alex: amt * alexR, karin: amt * karinR }
  })

  const alexPersonal = [
    ...(alex.investments ?? []),
    ...(alex.individualCosts ?? []),
    ...(alex.debtRepayment ?? []),
  ].reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const karinPersonal = [
    ...(karin.investments ?? []),
    ...(karin.individualCosts ?? []),
    ...(karin.debtRepayment ?? []),
  ].reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const sharedAlex = fixedTotal * alexR + ausgabenRows.reduce((s, r) => s + r.alex, 0)
  const sharedKarin = fixedTotal * karinR + ausgabenRows.reduce((s, r) => s + r.karin, 0)

  return {
    income: { alex: alexIncome, karin: karinIncome, emma: emmaIncome },
    fixedTotal,
    ausgabenRows,
    variableExpenses,
    alexR, karinR,
    transfer: {
      alexTotal: sharedAlex + alexPersonal,
      karinTotal: sharedKarin + karinPersonal,
    },
  }
}

// ── snapshot display ──────────────────────────────────────────────────────────

function SnapshotRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 text-xs">
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>
    </div>
  )
}

function SnapshotSection({ title }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mt-3 mb-0.5"
      style={{ color: 'rgba(255,255,255,0.3)' }}>
      {title}
    </p>
  )
}

function Snapshot({ data }) {
  const s = calcSnapshot(data)
  if (!s) return (
    <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
      Kein Snapshot verfügbar
    </p>
  )

  return (
    <div
      className="mt-3 rounded-xl px-4 py-3"
      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Two columns: Budget | Transfer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Left: Budget */}
        <div>
          <SnapshotSection title="Einkommen" />
          <SnapshotRow label="Alex" value={fmt(s.income.alex)} />
          <SnapshotRow label="Karin" value={fmt(s.income.karin)} />
          <SnapshotRow label="Emma" value={fmt(s.income.emma)} />

          <SnapshotSection title="Fixkosten" />
          <SnapshotRow label="Gesamt" value={fmt(s.fixedTotal)} />

          {s.ausgabenRows.length > 0 && (
            <>
              <SnapshotSection title="Ausgaben" />
              {s.ausgabenRows.map((r, i) => (
                <SnapshotRow key={i} label={r.label} value={fmt(r.alex + r.karin)} />
              ))}
            </>
          )}
        </div>

        {/* Right: Transfer */}
        <div>
          <SnapshotSection title="Zu überweisen" />
          <div
            className="flex gap-3 mt-2"
          >
            <div className="flex-1 rounded-lg px-3 py-2 text-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Alex</p>
              <p className="text-sm font-bold text-white">{fmt(s.transfer.alexTotal)}</p>
            </div>
            <div className="flex-1 rounded-lg px-3 py-2 text-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Karin</p>
              <p className="text-sm font-bold text-white">{fmt(s.transfer.karinTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── entry card ────────────────────────────────────────────────────────────────

function LogEntry({ entry, isFirst }) {
  const [expanded, setExpanded] = useState(isFirst)
  const duration = formatDuration(entry.duration_seconds)

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: isFirst ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isFirst ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: isFirst ? '#c4b5fd' : 'rgba(255,255,255,0.85)' }}>
            {formatDate(entry.saved_at)}
            {isFirst && (
              <span
                className="ml-2 text-xs px-1.5 py-0.5 rounded-full align-middle"
                style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }}
              >
                Aktuell
              </span>
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {formatTime(entry.saved_at)} Uhr
          </p>
        </div>

        <div className="flex items-center gap-3">
          {duration && (
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
            >
              {duration}
            </span>
          )}
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {expanded && <Snapshot data={entry.snapshot} />}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ChangeLogPage() {
  const [log, setLog] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getBudgetLog()
      .then(setLog)
      .catch(() => setError('Änderungshistorie konnte nicht geladen werden.'))
  }, [])

  return (
    <Card title="Änderungshistorie">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && log === null && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</p>
      )}
      {log && log.length === 0 && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Noch keine Einträge vorhanden.</p>
      )}
      {log && log.length > 0 && (
        <div className="space-y-2">
          {log.map((entry, i) => (
            <LogEntry key={entry.id} entry={entry} isFirst={i === 0} />
          ))}
        </div>
      )}
    </Card>
  )
}
