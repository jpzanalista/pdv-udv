CREATE TYPE "public"."movimento_destino" AS ENUM('tesouraria', 'compra');--> statement-breakpoint
CREATE TYPE "public"."movimento_status" AS ENUM('pendente', 'validada');--> statement-breakpoint
CREATE TYPE "public"."movimento_tipo" AS ENUM('sangria', 'suprimento');--> statement-breakpoint
CREATE TABLE "caixa_movimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"expediente_id" uuid NOT NULL,
	"tipo" "movimento_tipo" NOT NULL,
	"destino" "movimento_destino",
	"valor" numeric(12, 2) NOT NULL,
	"descricao" varchar(255),
	"recebedor" varchar(160),
	"status" "movimento_status",
	"validado_por" uuid,
	"validado_em" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caixa_movimentos" ADD CONSTRAINT "caixa_movimentos_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixa_movimentos" ADD CONSTRAINT "caixa_movimentos_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixa_movimentos" ADD CONSTRAINT "caixa_movimentos_validado_por_usuarios_id_fk" FOREIGN KEY ("validado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixa_movimentos" ADD CONSTRAINT "caixa_movimentos_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;