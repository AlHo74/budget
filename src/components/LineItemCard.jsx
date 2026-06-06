import { useState } from 'react'
import { fmt, pct, sumItems } from '../utils.js'
import { Card, Divider } from './IncomeCard.jsx'

function LineItem({ item, onChange, onDelete }) {
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal] = useState(item.name)

  function commitName() {
    setEditName(false)
    if (nameVal !== item.name) onChange({ ...item, name: nameVal })
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      {editName ? (
        <input
          autoFocus
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') commitName() }}
          className="flex-1 px-2 py-1 rounded-lg text-white text-sm focus:outline-none focus:ring-1"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(99,102,241,0.5)',
          }}
        />
      ) : (
        <span
          className="flex-1 text-sm cursor-pointer hover:text-white transition-colors"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          onClick={() => { setEditName(true); setNameVal(item.name) }}
        >
          {item.name || <span style={{ color: 'rgba(255,255,255,0.25)' }}>Name…</span>}
        </span>
      )}

      <input
        type="number"
        value={item.amount || ''}
        onChange={e => onChange({ ...item, amount: Number(e.target.value) || 0 })}
        placeholder="0"
        className="text-right w-24 px-2 py-1 rounded-lg text-white text-sm focus:outline-none focus:ring-1"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onFocus={e => e.target.select()}
      />

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
        style={{ color: 'rgba(255,100,100,0.7)' }}
        title="Entfernen"
      >
        ×
      </button>
    </div>
  )
}

export default function LineItemCard({ title, items, onChange, totalLabel, totalBase }) {
  function updateItem(id, updated) {
    onChange(items.map(i => i.id === id ? updated : i))
  }

  function deleteItem(id) {
    onChange(items.filter(i => i.id !== id))
  }

  function addItem() {
    onChange([...items, { id: crypto.randomUUID(), name: '', amount: 0 }])
  }

  const total = sumItems(items)

  return (
    <Card title={title}>
      {items.map(item => (
        <LineItem
          key={item.id}
          item={item}
          onChange={updated => updateItem(item.id, updated)}
          onDelete={() => deleteItem(item.id)}
        />
      ))}

      <button
        onClick={addItem}
        className="mt-2 text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
        style={{
          color: 'rgba(99,102,241,0.9)',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        + Hinzufügen
      </button>

      <Divider />

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{totalLabel}</span>
        <span className="font-semibold text-white">
          {fmt(total)}
          {totalBase > 0 && (
            <span className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {pct(total, totalBase)}
            </span>
          )}
        </span>
      </div>
    </Card>
  )
}
