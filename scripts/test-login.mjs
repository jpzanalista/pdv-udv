// Smoke test do login real (USER_SRP_AUTH no backend).
// A SENHA é digitada na hora (oculta) e NÃO é salva em lugar nenhum —
// vai só do seu terminal para a API local. Rode com: pnpm test:login
//
// Pré-requisitos: API rodando (pnpm dev:host ou docker) e .env com COGNITO_*.

import readline from 'node:readline'

const API = process.env.API_URL ?? 'http://localhost:3333'
const DEFAULT_EMAIL = process.env.REUNI_EMAIL ?? 'joaozanela@gmail.com'

function ask(query, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      // Suprime o eco dos caracteres digitados (mostra só o prompt).
      rl._writeToOutput = (s) => {
        if (s.includes(query)) rl.output.write(query)
      }
    }
    rl.question(query, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  let json
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { status: res.status, json }
}

const emailInput = await ask(`E-mail REUNI [${DEFAULT_EMAIL}]: `)
const email = emailInput || DEFAULT_EMAIL
const password = await ask('Senha (oculta): ', { hidden: true })

console.log('\n→ /auth/srp-debug (mostra os cargos lidos do token):')
const dbg = await post('/api/auth/srp-debug', { email, password })
console.log(JSON.stringify(dbg, null, 2))

console.log('\n→ /auth/login (emite nosso JWT se o cargo for autorizado):')
const login = await post('/api/auth/login', { email, password })
if (login.status === 200) {
  console.log('  ✓ login OK — accessToken:', `${String(login.json?.accessToken).slice(0, 24)}...`)
} else {
  console.log(`  HTTP ${login.status} —`, JSON.stringify(login.json))
  console.log('  (403 "sem cargo" é esperado se sua conta não tem cargo de empório mapeado)')
}
