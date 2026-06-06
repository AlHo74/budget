import { useState, useEffect } from 'react'
import { getBudgetLog } from '../api.js'

function weeksAgo(isoString) {
  if (!isoString) return null
  const diff = Date.now() - new Date(isoString).getTime()
  return Math.floor(diff / (7 * 24 * 3600 * 1000))
}

function formatDuration(seconds) {
  if (seconds == null) return '—'
  const days = Math.floor(seconds / 86400)
  const weeks = Math.floor(days / 7)
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} aktiv`
  if (days >= 1) return `${days} ${days === 1 ? 'Tag' : 'Tage'} aktiv`
  return 'Weniger als 1 Tag aktiv'
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(isoString))
}

export default function ChangeLogBadge({ lastSaved }) {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState(null)
  const [logError, setLogError] = useState(null)

  const weeks = weeksAgo(lastSaved)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!e.target.closest('[data-changelog]')) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    setLog(null)
  }, [lastSaved])

  useEffect(() => {
    if (!open || log !== null) return
    let cancelled = false
    setLogError(null)
    getBudgetLog()
      .then(data => { if (!cancelled) setLog(data) })
      .catch(() => { if (!cancelled) setLogError('Fehler beim Laden') })
    return () => { cancelled = true }
  }, [open, log])

  function handleToggle() {
    setOpen(o => !o)
  }

  if (weeks === null) return null

  const label = weeks === 0
    ? 'Weniger als 1 Woche'
    : `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`

  return (
    <div className="relative" data-changelog="">
      <button
        onClick={handleToggle}
        className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
      >
        ● {label} seit letzter Änderung
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-10 w-64 rounded-xl p-4 shadow-xl"
          style={{
            background: 'rgba(20,20,35,0.97)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            Änderungshistorie
          </p>
          {logError && <p className="text-xs text-red-400">{logError}</p>}
          {!logError && log === null && (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</p>
          )}
          {log && log.length === 0 && (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Noch keine Einträge</p>
          )}
          {log && log.map(entry => (
            <div
              key={entry.id}
              className="flex justify-between text-xs py-1.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{formatDate(entry.saved_at)}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDuration(entry.duration_seconds)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
