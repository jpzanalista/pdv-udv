import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// ---------- enums ----------
export const roleEnum = pgEnum('role', [
  'responsavel_emporio',
  'presidencia',
  'representante_nucleo',
  'tesoureiro_1',
  'tesoureiro_2',
  'admin',
  'socio',
])
export const accountTypeEnum = pgEnum('account_type', ['familiar', 'visitante', 'institucional'])
export const personKindEnum = pgEnum('person_kind', ['socio', 'visitante'])
export const paymentMethodEnum = pgEnum('payment_method', [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'conta',
])
export const terminalTypeEnum = pgEnum('terminal_type', ['desktop', 'celular'])
export const expedienteStatusEnum = pgEnum('expediente_status', ['aberto', 'fechado'])
export const lancamentoTipoEnum = pgEnum('lancamento_tipo', ['debito', 'credito'])
export const cobrancaStatusEnum = pgEnum('cobranca_status', [
  'pendente',
  'confirmada',
  'cancelada',
  'estornada',
])
export const nucleoTypeEnum = pgEnum('nucleo_type', ['sede', 'nucleo', 'dav'])
export const movimentoTipoEnum = pgEnum('movimento_tipo', ['sangria', 'suprimento'])
export const movimentoDestinoEnum = pgEnum('movimento_destino', ['tesouraria', 'compra'])
export const movimentoStatusEnum = pgEnum('movimento_status', ['pendente', 'validada'])

const money = (name: string) => numeric(name, { precision: 12, scale: 2 })

// ---------- estrutura UDV ----------
export const regioes = pgTable('regioes', {
  id: uuid('id').primaryKey().defaultRandom(),
  udvId: integer('udv_id').notNull().unique(),
  nome: varchar('nome', { length: 120 }).notNull(),
})

// ---------- tenant ----------
export const nucleos = pgTable('nucleos', {
  id: uuid('id').primaryKey().defaultRandom(),
  udvId: integer('udv_id').unique(),
  nome: varchar('nome', { length: 160 }).notNull(),
  type: nucleoTypeEnum('type').notNull().default('nucleo'),
  regionId: uuid('region_id').references(() => regioes.id),
  // CNPJ entra depois (quando o núcleo for ter subconta ASAAS) — por isso nullable.
  cnpj: varchar('cnpj', { length: 14 }).unique(),
  presEmail: varchar('pres_email', { length: 160 }),
  represEmail: varchar('repres_email', { length: 160 }),
  tesEmail: varchar('tes_email', { length: 160 }),
  secEmail: varchar('sec_email', { length: 160 }),
  asaasWalletId: varchar('asaas_wallet_id', { length: 80 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- identidade ----------
// Pessoa é GLOBAL (acima do tenant): 1 por CPF, 1 login. Vínculo com núcleos via pessoa_nucleo.
export const pessoas = pgTable('pessoas', {
  id: uuid('id').primaryKey().defaultRandom(),
  cpf: varchar('cpf', { length: 11 }).notNull().unique(),
  nome: varchar('nome', { length: 160 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 20 }),
  email: varchar('email', { length: 160 }),
  reuniId: varchar('reuni_id', { length: 80 }),
  nascimento: varchar('nascimento', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const pessoaNucleo = pgTable(
  'pessoa_nucleo',
  {
    pessoaId: uuid('pessoa_id')
      .notNull()
      .references(() => pessoas.id),
    nucleoId: uuid('nucleo_id')
      .notNull()
      .references(() => nucleos.id),
  },
  (t) => ({ uq: unique().on(t.pessoaId, t.nucleoId) }),
)

// Staff: usuário do sistema com papel. cognitoSub liga ao REUNI (auth); socio entra por OTP.
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id').references(() => nucleos.id), // null = admin global
  pessoaId: uuid('pessoa_id').references(() => pessoas.id),
  cognitoSub: varchar('cognito_sub', { length: 80 }).unique(),
  role: roleEnum('role').notNull(),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- contas do empório (conta familiar / visitante / institucional) ----------
export const contas = pgTable('contas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  tipo: accountTypeEnum('tipo').notNull(),
  nome: varchar('nome', { length: 160 }).notNull(),
  titularPessoaId: uuid('titular_pessoa_id').references(() => pessoas.id),
  descontoPct: numeric('desconto_pct', { precision: 5, scale: 2 }).default('0').notNull(),
  ativa: boolean('ativa').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const contaMembros = pgTable(
  'conta_membros',
  {
    contaId: uuid('conta_id')
      .notNull()
      .references(() => contas.id),
    pessoaId: uuid('pessoa_id')
      .notNull()
      .references(() => pessoas.id),
  },
  (t) => ({ uq: unique().on(t.contaId, t.pessoaId) }),
)

// ---------- catálogo ----------
export const categorias = pgTable('categorias', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  nome: varchar('nome', { length: 120 }).notNull(),
  ordem: integer('ordem').default(0).notNull(),
})

export const produtos = pgTable('produtos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  categoriaId: uuid('categoria_id').references(() => categorias.id),
  codigo: varchar('codigo', { length: 40 }),
  codigoBarras: varchar('codigo_barras', { length: 40 }),
  descricao: varchar('descricao', { length: 160 }).notNull(),
  precoVenda: money('preco_venda').notNull(),
  precoCusto: money('preco_custo').default('0').notNull(),
  controlaEstoque: boolean('controla_estoque').default(false).notNull(),
  estoqueAtual: numeric('estoque_atual', { precision: 12, scale: 3 }).default('0').notNull(),
  imagemUrl: text('imagem_url'),
  ativo: boolean('ativo').default(true).notNull(),
  exibirVenda: boolean('exibir_venda').default(true).notNull(),
  exibirMobile: boolean('exibir_mobile').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- terminais e expedientes ----------
export const terminais = pgTable('terminais', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  nome: varchar('nome', { length: 120 }).notNull(),
  tipo: terminalTypeEnum('tipo').notNull(),
  offlineEnabled: boolean('offline_enabled').default(false).notNull(), // só desktop
  lastSeen: timestamp('last_seen', { withTimezone: true }),
})

export const expedientes = pgTable('expedientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  terminalId: uuid('terminal_id').references(() => terminais.id),
  status: expedienteStatusEnum('status').default('aberto').notNull(),
  fundoTroco: money('fundo_troco').default('0').notNull(),
  abertoPor: uuid('aberto_por').references(() => usuarios.id),
  abertoEm: timestamp('aberto_em', { withTimezone: true }).defaultNow().notNull(),
  fechadoEm: timestamp('fechado_em', { withTimezone: true }),
  valorContado: money('valor_contado'),
  valorEsperado: money('valor_esperado'),
  diferenca: money('diferenca'),
})

// Sangria (saída) / Suprimento (entrada) de dinheiro no caixa.
export const caixaMovimentos = pgTable('caixa_movimentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  expedienteId: uuid('expediente_id')
    .notNull()
    .references(() => expedientes.id),
  tipo: movimentoTipoEnum('tipo').notNull(),
  destino: movimentoDestinoEnum('destino'), // só sangria
  valor: money('valor').notNull(),
  descricao: varchar('descricao', { length: 255 }),
  recebedor: varchar('recebedor', { length: 160 }), // sangria→compra
  status: movimentoStatusEnum('status'), // pendente p/ tesouraria; validação na Fase 2
  validadoPor: uuid('validado_por').references(() => usuarios.id),
  validadoEm: timestamp('validado_em', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- vendas (id gerado no cliente p/ offline) ----------
export const vendas = pgTable(
  'vendas',
  {
    id: uuid('id').primaryKey(), // UUID gerado no terminal (offline-safe)
    nucleoId: uuid('nucleo_id')
      .notNull()
      .references(() => nucleos.id),
    expedienteId: uuid('expediente_id').references(() => expedientes.id),
    terminalId: uuid('terminal_id').references(() => terminais.id),
    numero: integer('numero').notNull(), // sequencial por terminal/expediente
    personKind: personKindEnum('person_kind'),
    pessoaId: uuid('pessoa_id').references(() => pessoas.id),
    contaId: uuid('conta_id').references(() => contas.id),
    total: money('total').notNull(),
    desconto: money('desconto').default('0').notNull(),
    cancelada: boolean('cancelada').default(false).notNull(),
    motivoCancelamento: text('motivo_cancelamento'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(), // data real (retroativo)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => usuarios.id),
    retroativa: boolean('retroativa').default(false).notNull(),
  },
  (t) => ({ uqNumero: unique().on(t.terminalId, t.numero) }),
)

export const vendaItens = pgTable('venda_itens', {
  id: uuid('id').primaryKey(),
  vendaId: uuid('venda_id')
    .notNull()
    .references(() => vendas.id),
  produtoId: uuid('produto_id').references(() => produtos.id),
  descricao: varchar('descricao', { length: 160 }).notNull(),
  qtde: numeric('qtde', { precision: 12, scale: 3 }).notNull(),
  unitario: money('unitario').notNull(),
  total: money('total').notNull(),
})

export const pagamentos = pgTable('pagamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendaId: uuid('venda_id')
    .notNull()
    .references(() => vendas.id),
  metodo: paymentMethodEnum('metodo').notNull(),
  valor: money('valor').notNull(),
})

// ---------- conta-corrente (append-only) ----------
export const lancamentos = pgTable('lancamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  contaId: uuid('conta_id')
    .notNull()
    .references(() => contas.id),
  tipo: lancamentoTipoEnum('tipo').notNull(),
  valor: money('valor').notNull(),
  vendaId: uuid('venda_id').references(() => vendas.id),
  cobrancaId: uuid('cobranca_id'),
  descricao: varchar('descricao', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- cobranças ASAAS ----------
export const cobrancas = pgTable('cobrancas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nucleoId: uuid('nucleo_id')
    .notNull()
    .references(() => nucleos.id),
  contaId: uuid('conta_id').references(() => contas.id),
  asaasPaymentId: varchar('asaas_payment_id', { length: 60 }).unique(),
  valor: money('valor').notNull(),
  status: cobrancaStatusEnum('status').default('pendente').notNull(),
  invoiceUrl: text('invoice_url'),
  dueDate: varchar('due_date', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
