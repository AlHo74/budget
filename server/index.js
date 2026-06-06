import express from 'express'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg
const app = express()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

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

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

const PORT = process.env.PORT || 3000
initDb()
  .then(() => app.listen(PORT, () => console.log(`Server running on :${PORT}`)))
  .catch(err => { console.error('DB init failed', err); process.exit(1) })
