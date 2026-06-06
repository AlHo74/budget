import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ color: 'white', padding: '2rem' }}>Loading…</div>
  </StrictMode>,
)
