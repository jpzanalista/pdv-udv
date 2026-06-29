import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import type { Categoria, Produto } from '@/lib/types'

function num(s: string): number | undefined {
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isNaN(n) ? undefined : n
}

export function ProdutoFormModal({
  produto,
  categorias,
  onClose,
  onSaved,
}: {
  produto: Produto | null // null = novo
  categorias: Categoria[]
  onClose: () => void
  onSaved: () => void
}) {
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [codigo, setCodigo] = useState(produto?.codigo ?? '')
  const [codigoBarras, setCodigoBarras] = useState(produto?.codigoBarras ?? '')
  const [categoriaId, setCategoriaId] = useState(produto?.categoriaId ?? '')
  const [precoCusto, setPrecoCusto] = useState(produto ? String(produto.precoCusto) : '')
  const [precoVenda, setPrecoVenda] = useState(produto ? String(produto.precoVenda) : '')
  const [estoqueAtual, setEstoqueAtual] = useState(produto ? String(produto.estoqueAtual) : '')
  const [estoqueMinimo, setEstoqueMinimo] = useState(produto ? String(produto.estoqueMinimo) : '')
  const [controlaEstoque, setControlaEstoque] = useState(produto?.controlaEstoque ?? false)
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [exibirVenda, setExibirVenda] = useState(produto?.exibirVenda ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!descricao.trim()) {
      setErro('Informe a descrição.')
      return
    }
    setSalvando(true)
    setErro(null)
    const payload = {
      descricao: descricao.trim(),
      codigo: codigo.trim() || undefined,
      codigoBarras: codigoBarras.trim() || undefined,
      categoriaId: categoriaId || undefined,
      precoVenda: num(precoVenda) ?? 0,
      precoCusto: num(precoCusto),
      estoqueAtual: num(estoqueAtual),
      estoqueMinimo: num(estoqueMinimo),
      controlaEstoque,
      ativo,
      exibirVenda,
    }
    try {
      if (produto) {
        await api(`/produtos/${produto.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await api('/produtos', { method: 'POST', body: JSON.stringify(payload) })
      }
      onSaved()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <Card className="my-6 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{produto ? 'Editar produto' : 'Novo produto'}</h2>
        <form onSubmit={salvar} className="flex flex-col gap-3">
          <Field label="Descrição" htmlFor="descricao">
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Código" htmlFor="codigo">
              <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </Field>
            <Field label="Código de barras" htmlFor="barras">
              <Input id="barras" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} />
            </Field>
          </div>

          <Field label="Categoria" htmlFor="categoria">
            <select
              id="categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="min-h-touch w-full rounded border border-line bg-white px-3 text-ink"
            >
              <option value="">— sem categoria —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Custo (R$)" htmlFor="custo">
              <Input id="custo" inputMode="decimal" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} />
            </Field>
            <Field label="Venda (R$)" htmlFor="venda">
              <Input id="venda" inputMode="decimal" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estoque atual" htmlFor="estoque">
              <Input id="estoque" inputMode="decimal" value={estoqueAtual} onChange={(e) => setEstoqueAtual(e.target.value)} />
            </Field>
            <Field label="Estoque mínimo (alerta)" htmlFor="estoque-min">
              <Input id="estoque-min" inputMode="decimal" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} />
            </Field>
          </div>
          <p className="-mt-1 text-xs text-ink-light">
            Estoque só é controlado/baixado nos produtos com "Controlar estoque" marcado (consignados ficam de fora).
          </p>

          <div className="flex flex-wrap gap-4 pt-1 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={exibirVenda} onChange={(e) => setExibirVenda(e.target.checked)} /> Exibir na venda
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={controlaEstoque} onChange={(e) => setControlaEstoque(e.target.checked)} /> Controlar estoque
            </label>
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <div className="mt-2 flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
