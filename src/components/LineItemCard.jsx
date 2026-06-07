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
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(99,102,241,0.6)',
          }}
        />
      ) : (
        <span
          className="flex-1 text-sm cursor-pointer hover:text-white transition-colors"
          style={{ color: 'rgba(255,255,255,0.82)' }}
          onClick={() => { setEditName(true); setNameVal(item.name) }}
        >
          {item.name || <span style={{ color: 'rgba(255,255,255,0.3)' }}>Name…</span>}
        </span>
      )}

      <input
        type="number"
        value={item.amount || ''}
        onChange={e => onChange({ ...item, amount: Number(e.target.value) || 0 })}
        placeholder="0"
        className="text-right w-24 px-2 py-1 rounded-lg text-white text-sm focus:outline-none focus:ring-1"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
        onFocus={e => e.target.select()}
      />

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
        style={{ color: 'rgba(255,100,100,0.8)' }}
        title="Entfernen"
      >
        ×
      </button>
    </div>
  )
}

// Single-section card (original usage)
export default function LineItemCard({ title, items, onChange, totalLabel, totalBase, accent, borderAccent }) {
  function updateItem(id, updated) {
    onChange(items.map(i => i.id === id ? updated : i))
  }

  function deleteItem(id) {
    onChange(items.filter(i => i.id !== id))
  }

  function addItem() {
    onChange([...items, { id: Math.random().toString(36).slice(2) + Date.now().toString(36), name: '', amount: 0 }])
  }

  const total = sumItems(items)

  return (
    <Card title={title} accent={accent} borderAccent={borderAccent}>
      {items.map(item => (
        <LineItem
          key={item.id}
          item={item}
          onChange={updated => updateItem(item.id, updated)}
          onDelete={() => deleteItem(item.id)}
        />
      ))}

      <AddButton onClick={addItem} />
      <Divider />
      <TotalRow label={totalLabel} total={total} base={totalBase} />
    </Card>
  )
}

// Two-section card: Ausgaben (top) + Fixkosten (bottom) merged
export function CombinedCostsCard({ fixedCosts, variableExpenses, onFixedChange, onVariableChange, totalBase, accent, borderAccent }) {
  function updateFixed(id, updated) { onFixedChange(fixedCosts.map(i => i.id === id ? updated : i)) }
  function deleteFixed(id) { onFixedChange(fixedCosts.filter(i => i.id !== id)) }
  function addFixed() { onFixedChange([...fixedCosts, { id: uid(), name: '', amount: 0 }]) }

  function updateVariable(id, updated) { onVariableChange(variableExpenses.map(i => i.id === id ? updated : i)) }
  function deleteVariable(id) { onVariableChange(variableExpenses.filter(i => i.id !== id)) }
  function addVariable() { onVariableChange([...variableExpenses, { id: uid(), name: '', amount: 0 }]) }

  const totalFixed = sumItems(fixedCosts)
  const totalVariable = sumItems(variableExpenses)
  const totalAll = totalFixed + totalVariable

  return (
    <Card title="Fixkosten & Ausgaben" accent={accent} borderAccent={borderAccent}>
      {/* Ausgaben section — at top per spec */}
      <SectionLabel>Ausgaben</SectionLabel>
      {variableExpenses.map(item => (
        <LineItem key={item.id} item={item} onChange={u => updateVariable(item.id, u)} onDelete={() => deleteVariable(item.id)} />
      ))}
      <AddButton onClick={addVariable} />

      <Divider />

      {/* Fixkosten section */}
      <SectionLabel>Fixkosten</SectionLabel>
      {fixedCosts.map(item => (
        <LineItem key={item.id} item={item} onChange={u => updateFixed(item.id, u)} onDelete={() => deleteFixed(item.id)} />
      ))}
      <AddButton onClick={addFixed} />

      <Divider />
      <TotalRow label="Gesamt" total={totalAll} base={totalBase} />
    </Card>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mt-1 mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
      {children}
    </p>
  )
}

function AddButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="mt-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
      style={{
        color: 'rgba(139,92,246,0.95)',
        background: 'rgba(139,92,246,0.12)',
        border: '1px solid rgba(139,92,246,0.25)',
      }}
    >
      + Hinzufügen
    </button>
  )
}

function TotalRow({ label, total, base }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <span className="font-semibold text-white">
        {fmt(total)}
        {base > 0 && (
          <span className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pct(total, base)}
          </span>
        )}
      </span>
    </div>
  )
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
