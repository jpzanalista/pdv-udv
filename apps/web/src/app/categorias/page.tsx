'use client'

import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { Categoria } from '@/lib/types'

const ALLOWED = ['responsavel_emporio', 'admin']

export default function CategoriasPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [cats, setCats] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function carregar() {
    setCats(await api<Categoria[]>('/categorias'))
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

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const ordem = cats.reduce((m, c) => Math.max(m, c.ordem), -1) + 1
      await api('/categorias', { method: 'POST', body: JSON.stringify({ nome: novoNome.trim(), ordem }) })
      setNovoNome('')
      await carregar()
    } catch {
      setMsg('Erro ao criar categoria.')
    } finally {
      setBusy(false)
    }
  }

  async function salvarNome(id: string) {
    if (!editNome.trim()) return
    try {
      await api(`/categorias/${id}`, { method: 'PATCH', body: JSON.stringify({ nome: editNome.trim() }) })
      setEditId(null)
      await carregar()
    } catch {
      setMsg('Erro ao renomear.')
    }
  }

  async function mover(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= cats.length) return
    const a = cats[idx]
    const b = cats[j]
    await Promise.all([
      api(`/categorias/${a.id}`, { method: 'PATCH', body: JSON.stringify({ ordem: b.ordem }) }),
      api(`/categorias/${b.id}`, { method: 'PATCH', body: JSON.stringify({ ordem: a.ordem }) }),
    ])
    await carregar()
  }

  async function excluir(c: Categoria) {
    if (!window.confirm(`Excluir a categoria "${c.nome}"?`)) return
    setMsg(null)
    try {
      await api(`/categorias/${c.id}`, { method: 'DELETE' })
      await carregar()
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao excluir.')
    }
  }

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Categorias">
        <Card className="p-6 text-ink-muted">Acesso restrito ao responsável do empório.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Categorias">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">Categorias</h1>
        <p className="mt-1 text-base text-ink-muted">As abas da grade de venda — a ordem aqui é a ordem no caixa.</p>
      </div>

      <form onSubmit={criar} className="mt-4 flex gap-2">
        <Input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nova categoria…"
          className="h-11 flex-1 text-base"
        />
        <Button type="submit" disabled={busy || !novoNome.trim()} className="min-h-touch-lg">
          <Plus size={18} /> Adicionar
        </Button>
      </form>
      {msg && <p className="mt-2 text-sm font-semibold text-danger">{msg}</p>}

      <div className="mt-4 space-y-2">
        {cats.map((c, idx) => (
          <Card key={c.id} className="flex items-center gap-2 p-3">
            <div className="flex flex-col">
              <button
                type="button"
                aria-label="Subir"
                onClick={() => mover(idx, -1)}
                disabled={idx === 0}
                className="text-ink-light hover:text-brand disabled:opacity-30"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                aria-label="Descer"
                onClick={() => mover(idx, 1)}
                disabled={idx === cats.length - 1}
                className="text-ink-light hover:text-brand disabled:opacity-30"
              >
                <ArrowDown size={16} />
              </button>
            </div>

            <span className="grid h-7 w-8 shrink-0 place-items-center rounded bg-canvas text-xs font-mono text-ink-light">
              {idx + 1}
            </span>

            {editId === c.id ? (
              <>
                <Input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="h-10 flex-1 text-base"
                  onKeyDown={(e) => e.key === 'Enter' && salvarNome(c.id)}
                />
                <button
                  type="button"
                  aria-label="Salvar"
                  onClick={() => salvarNome(c.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white hover:opacity-90"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Cancelar"
                  onClick={() => setEditId(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-canvas"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 font-semibold text-ink">{c.nome}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditId(c.id)
                    setEditNome(c.nome)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-bg"
                >
                  <Pencil size={14} /> Renomear
                </button>
                <button
                  type="button"
                  aria-label="Excluir"
                  onClick={() => excluir(c)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-light hover:border-danger hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </Card>
        ))}
        {cats.length === 0 && <Card className="p-6 text-center text-ink-light">Nenhuma categoria ainda.</Card>}
      </div>
    </AppShell>
  )
}
