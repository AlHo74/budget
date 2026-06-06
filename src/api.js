export async function getBudget() {
  const res = await fetch('/api/budget')
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET /api/budget failed: ${res.status}`)
  return res.json()
}

export async function saveBudget(data) {
  const res = await fetch('/api/budget', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) throw new Error(`PUT /api/budget failed: ${res.status}`)
  return res.json()
}
