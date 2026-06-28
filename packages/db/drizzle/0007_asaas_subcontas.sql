CREATE TABLE "asaas_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"nucleo_id" uuid NOT NULL,
	"customer_id" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asaas_customers_pessoa_id_nucleo_id_unique" UNIQUE("pessoa_id","nucleo_id")
);
--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "asaas_api_key" varchar(200);--> statement-breakpoint
ALTER TABLE "asaas_customers" ADD CONSTRAINT "asaas_customers_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asaas_customers" ADD CONSTRAINT "asaas_customers_nucleo_id_nucleos_id_fk" FOREIGN KEY ("nucleo_id") REFERENCES "public"."nucleos"("id") ON DELETE no action ON UPDATE no action;