CREATE TABLE "corte_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corte_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"cliente_nome" varchar(160) NOT NULL,
	"valor_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cortes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"competencia" varchar(7) NOT NULL,
	"periodo_de" timestamp with time zone NOT NULL,
	"periodo_ate" timestamp with time zone NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"qtd_socios" integer DEFAULT 0 NOT NULL,
	"executado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"executado_por" uuid,
	CONSTRAINT "cortes_nucleo_id_competencia_unique" UNIQUE("nucleo_id","competencia")
);
--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "corte_id" uuid;--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "corte_dia" integer DEFAULT 28 NOT NULL;--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "corte_hora" varchar(5) DEFAULT '02:59' NOT NULL;--> statement-breakpoint
ALTER TABLE "corte_itens" ADD CONSTRAINT "corte_itens_corte_id_cortes_id_fk" FOREIGN KEY ("corte_id") REFERENCES "public"."cortes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corte_itens" ADD CONSTRAINT "corte_itens_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes" ADD CONSTRAINT "cortes_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes" ADD CONSTRAINT "cortes_executado_por_usuarios_id_fk" FOREIGN KEY ("executado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;