import { useState, useEffect, useCallback } from 'react'
import { getBudget, saveBudget } from './api.js'
import { defaultBudget } from './utils.js'
import Header from './components/Header.jsx'
import IncomeCard from './components/IncomeCard.jsx'
import LineItemCard from './components/LineItemCard.jsx'
import SummaryCard from './components/SummaryCard.jsx'
import PersonSection from './components/PersonSection.jsx'
import MobileBottomBar from './components/MobileBottomBar.jsx'
import TransferView from './components/TransferView.jsx'

export default function App() {
  const [budget, setBudget] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setActiveTab] = useState('budget')

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const result = await getBudget()
      if (result) {
        setBudget(result.data)
        setLastSaved(result.updated_at)
      } else {
        setBudget(defaultBudget())
      }
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function update(patch) {
    setBudget(prev => ({ ...prev, ...patch }))
    setDirty(true)
    setSaveError(null)
  }

  async function handleSave() {
    if (!budget) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await saveBudget(budget)
      setLastSaved(result.updated_at)
      setDirty(false)
    } catch (err) {
      setSaveError('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f1a' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Lade…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: '#0f0f1a' }}>
        <p className="text-red-400">{loadError}</p>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg text-white"
          style={{ background: 'rgba(99,102,241,0.8)' }}
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-6" style={{ background: '#0f0f1a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Header
          dirty={dirty}
          saving={saving}
          saveError={saveError}
          lastSaved={lastSaved}
          onSave={handleSave}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === 'transfer' ? (
          <TransferView budget={budget} />
        ) : (
          <>
            <IncomeCard
              income={budget.income}
              onChange={income => update({ income })}
            />

            <LineItemCard
              title="Beide – Fixkosten"
              items={budget.fixedCosts}
              onChange={fixedCosts => update({ fixedCosts })}
              totalLabel="Gesamt Fixkosten"
              totalBase={(Number(budget.income.alex) || 0) + (Number(budget.income.karin) || 0)}
            />

            <LineItemCard
              title="Beide – Ausgaben"
              items={budget.variableExpenses}
              onChange={variableExpenses => update({ variableExpenses })}
              totalLabel="Gesamt Ausgaben"
              totalBase={(Number(budget.income.alex) || 0) + (Number(budget.income.karin) || 0)}
            />

            <SummaryCard budget={budget} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PersonSection
                name="Alex"
                person={budget.alex}
                income={budget.income.alex}
                budget={budget}
                onChange={alex => update({ alex })}
              />
              <PersonSection
                name="Karin"
                person={budget.karin}
                income={budget.income.karin}
                budget={budget}
                onChange={karin => update({ karin })}
              />
            </div>
          </>
        )}
      </div>

      <MobileBottomBar dirty={dirty} saving={saving} onSave={handleSave} />
    </div>
  )
}
