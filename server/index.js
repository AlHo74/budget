import express from 'express'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg
const app = express()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const expensePool = process.env.EXPENSESHARE_DATABASE_URL
  ? new Pool({ connectionString: process.env.EXPENSESHARE_DATABASE_URL })
  : null

app.use(express.json())

const __dirname = dirname(fileURLToPath(import.meta.url))
app.use(express.static(join(__dirname, '../dist')))

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_log (
      id SERIAL PRIMARY KEY,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      duration_seconds INT,
      snapshot JSONB
    )
  `)
  // Add snapshot column if it doesn't exist (for existing deployments)
  await pool.query(`
    ALTER TABLE budget_log ADD COLUMN IF NOT EXISTS snapshot JSONB
  `)
}

app.get('/api/budget', async (req, res) => {
  try {
    const result = await pool.query('SELECT data, updated_at FROM budget WHERE id = 1')
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/budget', async (req, res) => {
  const { data } = req.body
  if (!data || typeof data !== 'object' || !data.income) return res.status(400).json({ error: 'invalid data' })
  try {
    const current = await pool.query('SELECT updated_at FROM budget WHERE id = 1')
    if (current.rows.length > 0) {
      const dur = await pool.query(
        `SELECT EXTRACT(EPOCH FROM (now() - $1))::INT AS secs`,
        [current.rows[0].updated_at]
      )
      await pool.query(
        'INSERT INTO budget_log (saved_at, duration_seconds, snapshot) VALUES (now(), $1, $2)',
        [dur.rows[0].secs, JSON.stringify(data)]
      )
    } else {
      await pool.query(
        'INSERT INTO budget_log (saved_at, duration_seconds, snapshot) VALUES (now(), NULL, $1)',
        [JSON.stringify(data)]
      )
    }
    const result = await pool.query(
      `INSERT INTO budget (id, data, updated_at) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()
       RETURNING data, updated_at`,
      [JSON.stringify(data)]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/budget/log', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, saved_at, duration_seconds, snapshot FROM budget_log ORDER BY saved_at DESC LIMIT 20'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/expenseshare/balance', async (req, res) => {
  if (!expensePool) return res.status(503).json({ error: 'EXPENSESHARE_DATABASE_URL not configured' })
  try {
    const result = await expensePool.query(`
      SELECT SUM(
        CASE WHEN paid_by = 'alex' AND split = 0.5 THEN amount * 0.5
             WHEN paid_by = 'alex' AND split = 1.0 THEN 0
             ELSE -amount * 0.5 END
      ) AS balance
      FROM expenses
      WHERE is_settlement = false
    `)
    res.json({ balance: parseFloat(result.rows[0].balance) || 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

const PORT = process.env.PORT || 3000
initDb()
  .then(() => app.listen(PORT, () => console.log(`Server running on :${PORT}`)))
  .catch(err => { console.error('DB init failed', err); process.exit(1) })
