const baseUrl = process.env.RECHARGE_LOAD_TEST_BASE_URL || 'http://127.0.0.1:3000'
const token = process.env.RECHARGE_LOAD_TEST_TOKEN
const concurrency = Number(process.env.RECHARGE_LOAD_TEST_CONCURRENCY || 50)
const total = Number(process.env.RECHARGE_LOAD_TEST_TOTAL || 200)

if (!token) {
  console.error('Missing RECHARGE_LOAD_TEST_TOKEN')
  process.exit(1)
}

const headers = { Authorization: `Bearer ${token}` }

async function runOnce(index) {
  const url = new URL('/api/admin/recharge-records', baseUrl)
  url.searchParams.set('limit', '20')
  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Request failed ${index}: ${res.status} ${text}`)
  }
  await res.json().catch(() => null)
}

async function runBatch() {
  const tasks = []
  for (let i = 0; i < concurrency; i += 1) {
    const index = Math.floor(Math.random() * total)
    tasks.push(runOnce(index))
  }
  await Promise.all(tasks)
}

async function main() {
  const rounds = Math.ceil(total / concurrency)
  const startedAt = Date.now()
  for (let i = 0; i < rounds; i += 1) {
    await runBatch()
  }
  const elapsed = Date.now() - startedAt
  console.log(`Load test completed in ${elapsed}ms for ${total} requests`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
