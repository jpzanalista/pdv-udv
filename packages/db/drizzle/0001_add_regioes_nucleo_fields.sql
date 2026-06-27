CREATE TYPE "public"."nucleo_type" AS ENUM('sede', 'nucleo', 'dav');--> statement-breakpoint
CREATE TABLE "regioes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"udv_id" integer NOT NULL,
	"nome" varchar(120) NOT NULL,
	CONSTRAINT "regioes_udv_id_unique" UNIQUE("udv_id")
);
--> statement-breakpoint
ALTER TABLE "nucleos" ALTER COLUMN "cnpj" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "udv_id" integer;--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "type" "nucleo_type" DEFAULT 'nucleo' NOT NULL;--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "region_id" uuid;--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "pres_email" varchar(160);--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "repres_email" varchar(160);--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "tes_email" varchar(160);--> statement-breakpoint
ALTER TABLE "nucleos" ADD COLUMN "sec_email" varchar(160);--> statement-breakpoint
ALTER TABLE "nucleos" ADD CONSTRAINT "nucleos_region_id_regioes_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regioes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nucleos" ADD CONSTRAINT "nucleos_udv_id_unique" UNIQUE("udv_id");