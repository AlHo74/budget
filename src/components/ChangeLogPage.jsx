import { useState, useEffect } from 'react'
import { getBudgetLog } from '../api.js'
import { Card } from './IncomeCard.jsx'

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
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!error && log === null && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</p>
      )}

      {log && log.length === 0 && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Noch keine Einträge vorhanden.</p>
      )}

      {log && log.length > 0 && (
        <div className="space-y-2">
          {log.map((entry, i) => {
            const duration = formatDuration(entry.duration_seconds)
            const isFirst = i === 0
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  background: isFirst
                    ? 'rgba(99,102,241,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isFirst ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}
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

                {duration && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {duration}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
