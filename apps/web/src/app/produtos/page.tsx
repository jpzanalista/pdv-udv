'use client'

import { formatBRL, reaisToCents } from '@pdv-udv/core'
import { Boxes, Download, Pencil, Plus, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { AppShell } from '@/components/AppShell'
import { EstoqueModal } from '@/components/produtos/EstoqueModal'
import { ProdutoFormModal } from '@/components/produtos/ProdutoFormModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { parseProdutosXlsx } from '@/lib/produtos-xlsx'
import { cn } from '@/lib/utils'
import type { Categoria, Produto } from '@/lib/types'

const ALLOWED = ['responsavel_emporio', 'admin']
const SEM_GRUPO = '__sem__'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const brl = (v: unknown) => formatBRL(reaisToCents(Number(v)))

export default function ProdutosPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [form, setForm] = useState<{ produto: Produto | null } | null>(null)
  const [estoqueProd, setEstoqueProd] = useState<Produto | null>(null)
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('') // '' = todos
  const fileRef = useRef<HTMLInputElement>(null)

  const catNome = useMemo(() => new Map(cats.map((c) => [c.id, c.nome])), [cats])

  async function carregar() {
    const [p, c] = await Promise.all([api<Produto[]>('/produtos'), api<Categoria[]>('/categorias')])
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

  const visiveis = useMemo(() => {
    const q = norm(busca.trim())
    return produtos.filter((p) => {
      if (grupo === SEM_GRUPO ? p.categoriaId != null : grupo && p.categoriaId !== grupo) return false
      if (!q) return true
      return norm(`${p.descricao} ${p.codigo ?? ''} ${p.codigoBarras ?? ''}`).includes(q)
    })
  }, [produtos, busca, grupo])

  function exportar() {
    const rows = visiveis.map((p) => ({
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

  async function toggle(p: Produto, campo: 'ativo' | 'exibirVenda') {
    const novo = !p[campo]
    setProdutos((prev) => prev.map((x) => (x.id === p.id ? { ...x, [campo]: novo } : x)))
    try {
      await api(`/produtos/${p.id}`, { method: 'PATCH', body: JSON.stringify({ [campo]: novo }) })
    } catch {
      setProdutos((prev) => prev.map((x) => (x.id === p.id ? { ...x, [campo]: !novo } : x)))
      setMsg('Não foi possível atualizar o produto.')
    }
  }

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Produtos">
        <Card className="p-6 text-ink-muted">Acesso restrito ao responsável do empório.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Produtos" fluid>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setForm({ produto: null })}>
          <Plus size={18} /> Novo produto
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={importando}>
          <Upload size={16} /> {importando ? 'Importando…' : 'Importar'}
        </Button>
        <Button variant="secondary" onClick={exportar} disabled={!visiveis.length}>
          <Download size={16} /> Exportar
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
      </div>

      {/* Filtros */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="min-h-touch rounded-lg border border-line bg-surface px-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 sm:w-56"
        >
          <option value="">Todos os grupos</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
          <option value={SEM_GRUPO}>Sem grupo</option>
        </select>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código…"
          className="sm:ml-auto sm:max-w-xs"
        />
      </div>

      {msg && <p className="mt-3 text-sm font-semibold text-ink">{msg}</p>}
      <p className="mt-3 text-sm text-ink-muted">{visiveis.length} produto(s).</p>

      {/* Desktop: tabela */}
      <Card className="mt-2 hidden overflow-hidden md:block">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-line bg-canvas text-center text-xs font-semibold uppercase tracking-wide text-ink-light">
              <th className="px-3 py-2.5">Cód.</th>
              <th className="px-3 py-2.5 text-left">Descrição</th>
              <th className="px-3 py-2.5">Grupo</th>
              <th className="px-3 py-2.5 text-right">Custo</th>
              <th className="px-3 py-2.5 text-right">Venda</th>
              <th className="px-3 py-2.5 text-right">Estoque</th>
              <th className="px-3 py-2.5">Ativo</th>
              <th className="px-3 py-2.5">Exibir</th>
              <th className="px-3 py-2.5">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((p) => (
              <tr
                key={p.id}
                className="border-b border-line/60 text-center last:border-0 even:bg-brand-bg/40 hover:bg-brand-bg/70"
              >
                <td className="px-3 py-3 font-mono text-ink-muted">{p.codigo ?? '—'}</td>
                <td className="px-3 py-3 text-left font-semibold text-ink">{p.descricao}</td>
                <td className="px-3 py-3 text-ink-muted">
                  {p.categoriaId ? (catNome.get(p.categoriaId) ?? '—') : '—'}
                </td>
                <td className="px-3 py-3 text-right text-ink-muted">{brl(p.precoCusto)}</td>
                <td className="px-3 py-3 text-right font-semibold text-ink">{brl(p.precoVenda)}</td>
                <td className="px-3 py-3 text-right">
                  <Estoque p={p} />
                </td>
                <td className="px-3 py-3">
                  <Switch checked={p.ativo} onCheckedChange={() => toggle(p, 'ativo')} aria-label="Ativo" />
                </td>
                <td className="px-3 py-3">
                  <Switch
                    checked={p.exibirVenda}
                    onCheckedChange={() => toggle(p, 'exibirVenda')}
                    aria-label="Exibir na venda"
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="inline-flex items-center gap-1.5">
                    {p.controlaEstoque && (
                      <button
                        type="button"
                        onClick={() => setEstoqueProd(p)}
                        title="Ajustar estoque"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-brand hover:text-brand"
                      >
                        <Boxes size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setForm({ produto: p })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-bg"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-ink-light">
                  Nenhum produto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Mobile: cartões */}
      <div className="mt-2 grid gap-2 md:hidden">
        {visiveis.map((p) => (
          <Card key={p.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{p.descricao}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-light">
                  <span className="font-mono">{p.codigo ?? '—'}</span>
                  <span>· {p.categoriaId ? (catNome.get(p.categoriaId) ?? '—') : 'Sem grupo'}</span>
                </p>
              </div>
              <span className="shrink-0 text-lg font-extrabold text-brand">{brl(p.precoVenda)}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink-muted">
              <span>Custo: {brl(p.precoCusto)}</span>
              <span>
                Estoque: {p.controlaEstoque ? <Estoque p={p} inline /> : <span className="text-ink-light">—</span>}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/60 pt-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Switch checked={p.ativo} onCheckedChange={() => toggle(p, 'ativo')} aria-label="Ativo" />
                <span className={cn('text-sm', p.ativo ? 'text-success' : 'text-ink-light')}>Ativo</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Switch
                  checked={p.exibirVenda}
                  onCheckedChange={() => toggle(p, 'exibirVenda')}
                  aria-label="Exibir na venda"
                />
                <span className={cn('text-sm', p.exibirVenda ? 'text-success' : 'text-ink-light')}>
                  Exibir
                </span>
              </label>
              <div className="ml-auto flex items-center gap-1.5">
                {p.controlaEstoque && (
                  <button
                    type="button"
                    onClick={() => setEstoqueProd(p)}
                    aria-label="Ajustar estoque"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-brand hover:text-brand"
                  >
                    <Boxes size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setForm({ produto: p })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-bg"
                >
                  <Pencil size={14} /> Editar
                </button>
              </div>
            </div>
          </Card>
        ))}
        {visiveis.length === 0 && <Card className="p-6 text-center text-ink-light">Nenhum produto.</Card>}
      </div>

      {form && (
        <ProdutoFormModal
          produto={form.produto}
          categorias={cats}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null)
            await carregar()
          }}
        />
      )}

      {estoqueProd && (
        <EstoqueModal produto={estoqueProd} onClose={() => setEstoqueProd(null)} onSaved={carregar} />
      )}
    </AppShell>
  )
}

function Estoque({ p, inline }: { p: Produto; inline?: boolean }) {
  if (!p.controlaEstoque) return <span className="text-ink-light">—</span>
  const baixo = Number(p.estoqueAtual) <= Number(p.estoqueMinimo)
  const txt = Number(p.estoqueAtual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
  return (
    <span className={cn(baixo ? 'font-semibold text-danger' : inline ? 'text-ink' : 'text-ink')}>
      {txt}
      {baixo && !inline && <span className="ml-1 text-xs">⚠</span>}
    </span>
  )
}
