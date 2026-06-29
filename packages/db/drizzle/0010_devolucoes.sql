CREATE TABLE "devolucoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"expediente_id" uuid NOT NULL,
	"venda_id" uuid NOT NULL,
	"venda_item_id" uuid NOT NULL,
	"produto_id" uuid,
	"qtde" numeric(12, 3) NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"metodo" "payment_method" NOT NULL,
	"motivo" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_venda_item_id_venda_itens_id_fk" FOREIGN KEY ("venda_item_id") REFERENCES "public"."venda_itens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;