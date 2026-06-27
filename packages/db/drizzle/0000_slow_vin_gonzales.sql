CREATE TYPE "public"."account_type" AS ENUM('familiar', 'visitante', 'institucional');--> statement-breakpoint
CREATE TYPE "public"."cobranca_status" AS ENUM('pendente', 'confirmada', 'cancelada', 'estornada');--> statement-breakpoint
CREATE TYPE "public"."expediente_status" AS ENUM('aberto', 'fechado');--> statement-breakpoint
CREATE TYPE "public"."lancamento_tipo" AS ENUM('debito', 'credito');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'conta');--> statement-breakpoint
CREATE TYPE "public"."person_kind" AS ENUM('socio', 'visitante');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('responsavel_emporio', 'presidencia', 'representante_nucleo', 'tesoureiro_1', 'tesoureiro_2', 'admin', 'socio');--> statement-breakpoint
CREATE TYPE "public"."terminal_type" AS ENUM('desktop', 'celular');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cobrancas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"conta_id" uuid,
	"asaas_payment_id" varchar(60),
	"valor" numeric(12, 2) NOT NULL,
	"status" "cobranca_status" DEFAULT 'pendente' NOT NULL,
	"invoice_url" text,
	"due_date" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cobrancas_asaas_payment_id_unique" UNIQUE("asaas_payment_id")
);
--> statement-breakpoint
CREATE TABLE "conta_membros" (
	"conta_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	CONSTRAINT "conta_membros_conta_id_pessoa_id_unique" UNIQUE("conta_id","pessoa_id")
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"tipo" "account_type" NOT NULL,
	"nome" varchar(160) NOT NULL,
	"titular_pessoa_id" uuid,
	"desconto_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"terminal_id" uuid,
	"status" "expediente_status" DEFAULT 'aberto' NOT NULL,
	"fundo_troco" numeric(12, 2) DEFAULT '0' NOT NULL,
	"aberto_por" uuid,
	"aberto_em" timestamp with time zone DEFAULT now() NOT NULL,
	"fechado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"tipo" "lancamento_tipo" NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"venda_id" uuid,
	"cobranca_id" uuid,
	"descricao" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nucleos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(160) NOT NULL,
	"cnpj" varchar(14) NOT NULL,
	"regiao" varchar(120),
	"asaas_wallet_id" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nucleos_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venda_id" uuid NOT NULL,
	"metodo" "payment_method" NOT NULL,
	"valor" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pessoa_nucleo" (
	"pessoa_id" uuid NOT NULL,
	"nucleo_id" uuid NOT NULL,
	CONSTRAINT "pessoa_nucleo_pessoa_id_nucleo_id_unique" UNIQUE("pessoa_id","nucleo_id")
);
--> statement-breakpoint
CREATE TABLE "pessoas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cpf" varchar(11) NOT NULL,
	"nome" varchar(160) NOT NULL,
	"whatsapp" varchar(20),
	"email" varchar(160),
	"reuni_id" varchar(80),
	"nascimento" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pessoas_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"categoria_id" uuid,
	"codigo" varchar(40),
	"codigo_barras" varchar(40),
	"descricao" varchar(160) NOT NULL,
	"preco_venda" numeric(12, 2) NOT NULL,
	"preco_custo" numeric(12, 2) DEFAULT '0' NOT NULL,
	"controla_estoque" boolean DEFAULT false NOT NULL,
	"estoque_atual" numeric(12, 3) DEFAULT '0' NOT NULL,
	"imagem_url" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"exibir_venda" boolean DEFAULT true NOT NULL,
	"exibir_mobile" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"tipo" "terminal_type" NOT NULL,
	"offline_enabled" boolean DEFAULT false NOT NULL,
	"last_seen" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid,
	"pessoa_id" uuid,
	"cognito_sub" varchar(80),
	"role" "role" NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_cognito_sub_unique" UNIQUE("cognito_sub")
);
--> statement-breakpoint
CREATE TABLE "venda_itens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venda_id" uuid NOT NULL,
	"produto_id" uuid,
	"descricao" varchar(160) NOT NULL,
	"qtde" numeric(12, 3) NOT NULL,
	"unitario" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"expediente_id" uuid,
	"terminal_id" uuid,
	"numero" integer NOT NULL,
	"person_kind" "person_kind",
	"pessoa_id" uuid,
	"conta_id" uuid,
	"total" numeric(12, 2) NOT NULL,
	"desconto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cancelada" boolean DEFAULT false NOT NULL,
	"motivo_cancelamento" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"retroativa" boolean DEFAULT false NOT NULL,
	CONSTRAINT "vendas_terminal_id_numero_unique" UNIQUE("terminal_id","numero")
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conta_membros" ADD CONSTRAINT "conta_membros_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conta_membros" ADD CONSTRAINT "conta_membros_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_titular_pessoa_id_pessoas_id_fk" FOREIGN KEY ("titular_pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_terminal_id_terminais_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_aberto_por_usuarios_id_fk" FOREIGN KEY ("aberto_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoa_nucleo" ADD CONSTRAINT "pessoa_nucleo_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoa_nucleo" ADD CONSTRAINT "pessoa_nucleo_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminais" ADD CONSTRAINT "terminais_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venda_itens" ADD CONSTRAINT "venda_itens_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venda_itens" ADD CONSTRAINT "venda_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_terminal_id_terminais_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;