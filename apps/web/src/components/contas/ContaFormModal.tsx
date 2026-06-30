import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { maskTelefone, telefoneCompleto, telefoneParaSalvar } from '@/lib/telefone'
import type { ContaRow } from '@/lib/types'

const TIPOS = [
  { value: 'socio', label: 'Sócio' },
  { value: 'visitante', label: 'Visitante' },
  { value: 'institucional', label: 'Institucional' },
]

export function ContaFormModal({
  conta,
  tipoInicial,
  onClose,
  onSaved,
}: {
  conta: ContaRow | null // null = nova
  tipoInicial?: string // tipo default ao criar (vem do filtro da página)
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [tipo, setTipo] = useState(conta?.tipo ?? tipoInicial ?? 'socio')
  const [cpf, setCpf] = useState(conta?.titularCpf ?? '')
  const [whatsapp, setWhatsapp] = useState(maskTelefone(conta?.titularWhatsapp ?? ''))
  const [ativa, setAtiva] = useState(conta?.ativa ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Informe o nome da conta.')
      return
    }
    if (tipo === 'visitante' && !telefoneCompleto(whatsapp)) {
      setErro('Visitante exige WhatsApp (recebe o link de pagamento por lá).')
      return
    }
    setSalvando(true)
    setErro(null)
    const payload = {
      nome: nome.trim(),
      tipo,
      cpf: cpf.trim() || undefined,
      whatsapp: telefoneParaSalvar(whatsapp),
      ativa,
    }
    try {
      if (conta) {
        await api(`/contas/${conta.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await api('/contas', { method: 'POST', body: JSON.stringify(payload) })
      }
      onSaved()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-start justify-center overflow-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="my-6 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">
          {conta ? 'Editar conta' : 'Nova conta'}
          {conta?.codigo != null && (
            <span className="ml-2 font-mono text-sm text-ink-light">
              #{String(conta.codigo).padStart(3, '0')}
            </span>
          )}
        </h2>
        <form onSubmit={salvar} className="flex flex-col gap-3">
          <Field label="Nome" htmlFor="nome">
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </Field>

          <Field label="Tipo" htmlFor="tipo">
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="min-h-touch w-full rounded border border-line bg-white px-3 text-ink"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CPF do titular" htmlFor="cpf">
              <Input id="cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} />
            </Field>
            <Field
              label={tipo === 'visitante' ? 'WhatsApp (obrigatório)' : 'WhatsApp do titular'}
              htmlFor="whatsapp"
            >
              <Input
                id="whatsapp"
                inputMode="tel"
                placeholder="+55 (00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                onBlur={() => setWhatsapp(maskTelefone(whatsapp))}
              />
            </Field>
          </div>
          <p className="-mt-1 text-xs text-ink-light">
            O titular só é vinculado com CPF de 11 dígitos. Sem CPF, a conta fica só com o nome.
          </p>

          <label className="flex items-center gap-2 pt-1 text-sm">
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} /> Ativa (aparece
            na venda)
          </label>

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
