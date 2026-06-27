'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
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

  async function excluir(id: string) {
    setMsg(null)
    try {
      await api(`/categorias/${id}`, { method: 'DELETE' })
      await carregar()
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao excluir.')
    }
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Categorias</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito ao responsável.</p>
        <Link href="/" className="mt-2 inline-block text-brand">
          ← início
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Categorias</h1>
        <Link href="/" className="text-sm text-ink-muted">
          ← início
        </Link>
      </div>
      <p className="mt-1 text-ink-muted">As abas da grade de venda (Passo 1, antes dos produtos).</p>

      <form onSubmit={criar} className="mt-4 flex gap-2">
        <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nova categoria…" />
        <Button type="submit" disabled={busy || !novoNome.trim()}>
          Adicionar
        </Button>
      </form>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}

      <div className="mt-4 space-y-2">
        {cats.map((c, idx) => (
          <Card key={c.id} className="flex items-center gap-2 p-3">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => mover(idx, -1)}
                disabled={idx === 0}
                className="text-ink-light disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => mover(idx, 1)}
                disabled={idx === cats.length - 1}
                className="text-ink-light disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            {editId === c.id ? (
              <>
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="flex-1" />
                <Button className="text-sm" onClick={() => salvarNome(c.id)}>
                  Salvar
                </Button>
                <Button variant="ghost" className="text-sm" onClick={() => setEditId(null)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-semibold">{c.nome}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditId(c.id)
                    setEditNome(c.nome)
                  }}
                  className="text-sm text-brand"
                >
                  renomear
                </button>
                <button type="button" onClick={() => excluir(c.id)} className="text-sm text-danger">
                  excluir
                </button>
              </>
            )}
          </Card>
        ))}
        {cats.length === 0 && <Card className="p-5 text-ink-light">Nenhuma categoria ainda.</Card>}
      </div>
    </main>
  )
}
