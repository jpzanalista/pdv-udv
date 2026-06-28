CREATE TYPE "public"."estoque_movimento_tipo" AS ENUM('entrada', 'ajuste');--> statement-breakpoint
CREATE TABLE "estoque_movimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"tipo" "estoque_movimento_tipo" NOT NULL,
	"qtde" numeric(12, 3) NOT NULL,
	"saldo_apos" numeric(12, 3) NOT NULL,
	"motivo" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "estoque_minimo" numeric(12, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "estoque_movimentos" ADD CONSTRAINT "estoque_movimentos_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estoque_movimentos" ADD CONSTRAINT "estoque_movimentos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;