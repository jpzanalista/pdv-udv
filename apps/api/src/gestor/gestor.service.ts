import { scryptSync, timingSafeEqual } from 'node:crypto'
import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { type Database, nucleos, regioes, usuarios, vendas } from '@pdv-udv/db'
import type { OnboardNucleoInput, Role, TokenPair } from '@pdv-udv/shared'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { CobrancasService } from '../asaas/cobrancas.service'
import { DB } from '../db/db.module'
import { ResponsavelService } from '../responsavel/responsavel.service'
import { TokenService } from '../auth/token.service'

function verificarSenha(senha: string, hash: string): boolean {
  const [saltHex, dkHex] = hash.split(':')
  if (!saltHex || !dkHex) return false
  const dk = scryptSync(senha, Buffer.from(saltHex, 'hex'), 64)
  const alvo = Buffer.from(dkHex, 'hex')
  return dk.length === alvo.length && timingSafeEqual(dk, alvo)
}

@Injectable()
export class GestorService {
  private readonly logger = new Logger('Gestor')

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly tokens: TokenService,
    private readonly responsavel: ResponsavelService,
    private readonly cobrancas: CobrancasService,
  ) {}

  /** Observação ("ver como"): emite um token escopado ao núcleo/papel, SOMENTE LEITURA. */
  async impersonar(nucleoId: string, papel: Role): Promise<TokenPair & { label: string }> {
    const [n] = await this.db
      .select({ nome: nucleos.nome, nomeExibicao: nucleos.nomeExibicao })
      .from(nucleos)
      .where(eq(nucleos.id, nucleoId))
      .limit(1)
    if (!n) throw new BadRequestException('Núcleo não encontrado')
    this.logger.warn(`[OBSERVAÇÃO] gestor → núcleo ${nucleoId} como ${papel} (somente leitura)`)
    const pair = await this.tokens.issue({
      sub: 'gestor-plataforma',
      nucleoId,
      role: papel,
      imp: true,
    })
    return { ...pair, label: `${n.nomeExibicao ?? n.nome} · ${papel === 'presidencia' ? 'Direção' : 'PDV'}` }
  }

  /** Login do gestor único (credenciais no .env). */
  async login(emailRaw: string, senha: string): Promise<TokenPair> {
    const invalido = new UnauthorizedException('E-mail ou senha incorretos')
    const gestorEmail = process.env.GESTOR_EMAIL?.trim().toLowerCase()
    const hash = process.env.GESTOR_SENHA_HASH
    if (!gestorEmail || !hash) throw new UnauthorizedException('Gestor não configurado')
    if (emailRaw.trim().toLowerCase() !== gestorEmail || !verificarSenha(senha, hash)) throw invalido
    return this.tokens.issue({ sub: 'gestor-plataforma', nucleoId: null, role: 'gestor_plataforma' })
  }

  /** Lista todos os núcleos com região, responsável e uso (roda em bypass de RLS). */
  async listarNucleos() {
    const ns = await this.db
      .select({
        id: nucleos.id,
        udvId: nucleos.udvId,
        nome: nucleos.nome,
        nomeExibicao: nucleos.nomeExibicao,
        ativo: nucleos.ativo,
        timezone: nucleos.timezone,
        cnpj: nucleos.cnpj,
        temAsaas: sql<boolean>`(${nucleos.asaasApiKey} is not null)`,
        regiao: regioes.nome,
        regiaoUdv: regioes.udvId,
      })
      .from(nucleos)
      .leftJoin(regioes, eq(regioes.id, nucleos.regionId))

    const uso = await this.db
      .select({
        nucleoId: vendas.nucleoId,
        qtd: sql<number>`count(*)::int`,
        ultima: sql<string | null>`max(${vendas.occurredAt})`,
      })
      .from(vendas)
      .groupBy(vendas.nucleoId)
    const usoMap = new Map(uso.map((u) => [u.nucleoId, u]))

    const resp = await this.db
      .select({ nucleoId: usuarios.nucleoId, email: usuarios.email, ativo: usuarios.ativo })
      .from(usuarios)
      .where(and(eq(usuarios.role, 'responsavel_emporio'), isNotNull(usuarios.email)))
    const respMap = new Map<string, { email: string | null; ativo: boolean }[]>()
    for (const r of resp) {
      if (!r.nucleoId) continue
      const arr = respMap.get(r.nucleoId) ?? []
      arr.push({ email: r.email, ativo: r.ativo })
      respMap.set(r.nucleoId, arr)
    }

    return ns
      .map((n) => ({
        ...n,
        vendas: usoMap.get(n.id)?.qtd ?? 0,
        ultimaVenda: usoMap.get(n.id)?.ultima ?? null,
        responsaveis: respMap.get(n.id) ?? [],
      }))
      .sort((a, b) => (a.regiaoUdv ?? 999) - (b.regiaoUdv ?? 999) || (a.udvId ?? 0) - (b.udvId ?? 0))
  }

  /** Onboarding 1-clique: cria núcleo + responsável (link p/ senha) + ASAAS se houver CNPJ. */
  async onboard(input: OnboardNucleoInput) {
    if (input.udvId) {
      const [existe] = await this.db
        .select({ id: nucleos.id })
        .from(nucleos)
        .where(eq(nucleos.udvId, input.udvId))
        .limit(1)
      if (existe) throw new BadRequestException(`Já existe núcleo com o número REUNI ${input.udvId}`)
    }

    const [n] = await this.db
      .insert(nucleos)
      .values({
        nome: input.nome,
        nomeExibicao: input.nomeExibicao ?? null,
        udvId: input.udvId ?? null,
        regionId: input.regionId ?? null,
        timezone: input.timezone ?? 'America/Sao_Paulo',
        cnpj: input.cnpj ?? null,
        ativo: true,
      })
      .returning({ id: nucleos.id })

    await this.responsavel.cadastrar(n.id, input.responsavelEmail)

    let asaas: { ok: boolean; msg: string } = { ok: false, msg: 'sem CNPJ — provisionar depois' }
    if (input.cnpj) {
      try {
        await this.cobrancas.provisionarSubconta(n.id)
        asaas = { ok: true, msg: 'subconta ASAAS provisionada' }
      } catch (e) {
        asaas = { ok: false, msg: e instanceof Error ? e.message : 'falha ao provisionar ASAAS' }
      }
    }
    return { id: n.id, asaas }
  }

  async definirAtivo(nucleoId: string, ativo: boolean) {
    const [row] = await this.db
      .update(nucleos)
      .set({ ativo })
      .where(eq(nucleos.id, nucleoId))
      .returning({ id: nucleos.id })
    if (!row) throw new BadRequestException('Núcleo não encontrado')
    return { ok: true, ativo }
  }
}
