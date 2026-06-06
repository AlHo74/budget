import ChangeLogBadge from './ChangeLogBadge.jsx'

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={
        active
          ? { background: 'rgba(99,102,241,0.8)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
      }
    >
      {children}
    </button>
  )
}

export default function Header({ dirty, saving, saveError, lastSaved, onSave, activeTab, onTabChange }) {
  const savedAt = lastSaved
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastSaved))
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Familienbudget</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {saveError
              ? <span className="text-red-400">{saveError}</span>
              : savedAt
              ? `Gespeichert: ${savedAt}`
              : 'Noch nicht gespeichert'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ChangeLogBadge lastSaved={lastSaved} />
          {dirty && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.2)', color: '#facc15' }}>
              ● Nicht gespeichert
            </span>
          )}
          <button
            onClick={onSave}
            disabled={saving || !dirty}
            className="px-5 py-2 rounded-xl font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.8)' }}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <TabButton active={activeTab === 'budget'} onClick={() => onTabChange('budget')}>
          Budget
        </TabButton>
        <TabButton active={activeTab === 'transfer'} onClick={() => onTabChange('transfer')}>
          Zu überweisen
        </TabButton>
      </div>
    </div>
  )
}
