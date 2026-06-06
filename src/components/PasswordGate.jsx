import { useState, useEffect } from 'react'

const STORAGE_KEY = 'fb_auth'
const PASSWORD = import.meta.env.VITE_APP_PASSWORD

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') setUnlocked(true)
  }, [])

  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => setError(false), 2000)
    return () => clearTimeout(id)
  }, [error])

  function handleSubmit(e) {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0f0f1a' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 border"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <p className="text-3xl text-center mb-2">💰</p>
        <h1 className="text-xl font-bold text-white text-center mb-1">Familienbudget</h1>
        <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Bitte Passwort eingeben
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Passwort"
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-white text-center text-lg tracking-widest focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
            }}
          />
          {error && (
            <p className="text-sm text-red-400 text-center">Falsches Passwort</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'rgba(99,102,241,0.8)' }}
          >
            Weiter
          </button>
        </form>
      </div>
    </div>
  )
}
