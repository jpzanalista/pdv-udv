/**
 * Limpeza dos dados de TESTE do piloto — preserva todo o histórico importado do TaurusPOS.
 *
 * Apaga apenas o transacional "ao vivo" (o import nunca criou lançamentos/sangrias/cortes):
 *   - vendas retroativa=false (+ itens/pagamentos), todos os lançamentos, cobranças,
 *     sangrias/suprimentos, cortes e expedientes (reseta o caixa).
 * Mantém: vendas retroativa=true (histórico) + seus itens/pagamentos, contas e produtos.
 *
 * Rodar (revisar primeiro):  pnpm --filter @pdv-udv/db db:limpar-testes
 * Aplicar de fato:           CONFIRMAR=SIM pnpm --filter @pdv-udv/db db:limpar-testes
 */
import { Pool } from 'pg'

const url = process.env.DATABASE_URL ?? 'postgresql://pdv:pdv@localhost:5440/pdv'
const CONFIRMAR = process.env.CONFIRMAR === 'SIM'

// Ordem respeita as FKs.
const STEPS: { label: string; sql: string }[] = [
  { label: 'devolucoes (todas — nenhuma vem do import)', sql: 'DELETE FROM devolucoes' },
  { label: 'lancamentos (todos — nenhum vem do import)', sql: 'DELETE FROM lancamentos' },
  {
    label: 'pagamentos de vendas de teste',
    sql: 'DELETE FROM pagamentos WHERE venda_id IN (SELECT id FROM vendas WHERE retroativa = false)',
  },
  {
    label: 'venda_itens de vendas de teste',
    sql: 'DELETE FROM venda_itens WHERE venda_id IN (SELECT id FROM vendas WHERE retroativa = false)',
  },
  { label: 'vendas de teste (retroativa=false)', sql: 'DELETE FROM vendas WHERE retroativa = false' },
  { label: 'corte_itens', sql: 'DELETE FROM corte_itens' },
  { label: 'cortes', sql: 'DELETE FROM cortes' },
  { label: 'cobrancas (Pix de teste)', sql: 'DELETE FROM cobrancas' },
  { label: 'caixa_movimentos (sangrias/suprimentos)', sql: 'DELETE FROM caixa_movimentos' },
  { label: 'expedientes (reseta o caixa)', sql: 'DELETE FROM expedientes' },
]

async function contagens(q: (s: string) => Promise<{ rows: { n: string }[] }>) {
  const t = [
    'vendas',
    'venda_itens',
    'pagamentos',
    'lancamentos',
    'devolucoes',
    'cobrancas',
    'cortes',
    'caixa_movimentos',
    'expedientes',
  ]
  const out: Record<string, number> = {}
  for (const tabela of t) {
    const r = await q(`SELECT count(*)::text AS n FROM ${tabela}`)
    out[tabela] = Number(r.rows[0].n)
  }
  const hist = await q('SELECT count(*)::text AS n FROM vendas WHERE retroativa = true')
  out['vendas (histórico preservado)'] = Number(hist.rows[0].n)
  return out
}

async function main() {
  const pool = new Pool({ connectionString: url })
  const client = await pool.connect()
  try {
    const q = (s: string) => client.query(s) as unknown as Promise<{ rows: { n: string }[] }>
    console.log(CONFIRMAR ? '⚠️  MODO APLICAR (CONFIRMAR=SIM)\n' : 'ℹ️  DRY-RUN (nada será apagado)\n')
    console.log('Antes:', await contagens(q))

    await client.query('BEGIN')
    for (const s of STEPS) {
      const r = await client.query(s.sql)
      console.log(`  ${CONFIRMAR ? '🗑️' : '·'} ${s.label}: ${r.rowCount}`)
    }

    if (CONFIRMAR) {
      await client.query('COMMIT')
      console.log('\n✅ Limpeza aplicada.')
      console.log('Depois:', await contagens(q))
    } else {
      await client.query('ROLLBACK')
      console.log('\nℹ️  DRY-RUN concluído — nada foi apagado.')
      console.log('    Para aplicar: CONFIRMAR=SIM pnpm --filter @pdv-udv/db db:limpar-testes')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
