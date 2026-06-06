export default function MobileBottomBar({ dirty, saving, onSave }) {
  if (!dirty) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 p-4 md:hidden"
      style={{
        background: 'rgba(15,15,26,0.9)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 rounded-xl font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: 'rgba(99,102,241,0.85)' }}
      >
        {saving ? 'Speichern…' : '● Änderungen speichern'}
      </button>
    </div>
  )
}
