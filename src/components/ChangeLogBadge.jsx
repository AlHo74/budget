function weeksAgo(isoString) {
  if (!isoString) return null
  const diff = Date.now() - new Date(isoString).getTime()
  return Math.floor(diff / (7 * 24 * 3600 * 1000))
}

export default function ChangeLogBadge({ lastSaved, onNavigate }) {
  const weeks = weeksAgo(lastSaved)
  if (weeks === null) return null

  const label = weeks === 0
    ? 'Weniger als 1 Woche'
    : `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`

  return (
    <button
      onClick={() => onNavigate('log')}
      className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
    >
      ● {label} seit letzter Änderung
    </button>
  )
}
