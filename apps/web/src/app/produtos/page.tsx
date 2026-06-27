'use client'

import { formatBRL, reaisToCents } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/Button'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { parseProdutosXlsx } from '@/lib/produtos-xlsx'
import type { Categoria, Produto } from '@/lib/types'

const ALLOWED = ['responsavel_emporio', 'admin']

export default function ProdutosPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const catNome = useMemo(() => new Map(cats.map((c) => [c.id, c.nome])), [cats])

  async function carregar() {
    const [p, c] = await Promise.all([
      api<Produto[]>('/produtos'),
      api<Categoria[]>('/categorias'),
    ])
    setProdutos(p)
    setCats(c)
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string }>('/auth/me')
      .then((m) => {
        setMe(m)
        if (ALLOWED.includes(m.role)) return carregar()
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router])

  function exportar() {
    const rows = produtos.map((p) => ({
      Codigo: p.codigo ?? '',
      CodigoBarras: p.codigoBarras ?? '',
      Descricao: p.descricao,
      Grupo: p.categoriaId ? (catNome.get(p.categoriaId) ?? '') : '',
      PrecoCusto: Number(p.precoCusto),
      PrecoVenda: Number(p.precoVenda),
      EstoqueAtual: Number(p.estoqueAtual ?? 0),
      ControlaEstoque: p.controlaEstoque ? 'Sim' : 'Não',
      Ativo: p.ativo ? 'Sim' : 'Não',
      ExibirVenda: p.exibirVenda ? 'Sim' : 'Não',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
    XLSX.writeFile(wb, 'produtos.xlsx')
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setMsg(null)
    try {
      const linhas = await parseProdutosXlsx(file)
      if (!linhas.length) {
        setMsg('Nenhuma linha válida na planilha.')
        return
      }
      const r = await api<{ criados: number; atualizados: number }>('/produtos/import', {
        method: 'POST',
        body: JSON.stringify({ produtos: linhas }),
      })
      setMsg(`Importado: ${r.criados} criado(s), ${r.atualizados} atualizado(s).`)
      await carregar()
    } catch (err) {
      setMsg(err instanceof ApiError ? `Erro: ${err.message}` : 'Erro ao importar.')
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Produtos</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito ao responsável do empório.</p>
        <Link href="/" className="mt-2 inline-block text-brand">
          ← início
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand">Produtos</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="text-sm"
            onClick={exportar}
            disabled={!produtos.length}
          >
            Exportar Excel
          </Button>
          <Button className="text-sm" onClick={() => fileRef.current?.click()} disabled={importando}>
            {importando ? 'Importando…' : 'Importar Excel'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onImport}
          />
          <Link href="/" className="whitespace-nowrap text-sm text-ink-muted">
            ← início
          </Link>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-ink">{msg}</p>}
      <p className="mt-1 text-ink-muted">{produtos.length} produto(s).</p>

      <div className="mt-4 overflow-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-light">
              <th className="p-3">Código</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Grupo</th>
              <th className="p-3 text-right">Custo</th>
              <th className="p-3 text-right">Venda</th>
              <th className="p-3">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="p-3">{p.codigo ?? '—'}</td>
                <td className="p-3">{p.descricao}</td>
                <td className="p-3">{p.categoriaId ? (catNome.get(p.categoriaId) ?? '—') : '—'}</td>
                <td className="p-3 text-right">{formatBRL(reaisToCents(Number(p.precoCusto)))}</td>
                <td className="p-3 text-right font-semibold">
                  {formatBRL(reaisToCents(Number(p.precoVenda)))}
                </td>
                <td className="p-3">{p.ativo ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
