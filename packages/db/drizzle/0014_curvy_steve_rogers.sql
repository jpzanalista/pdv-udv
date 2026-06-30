ALTER TABLE "pessoas" ALTER COLUMN "cpf" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contas" ADD COLUMN "codigo" integer;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_nucleo_id_codigo_unique" UNIQUE("nucleo_id","codigo");--> statement-breakpoint
-- backfill: código sequencial por núcleo, por ordem de criação (contas já existentes)
WITH seq AS (
  SELECT id, row_number() OVER (PARTITION BY nucleo_id ORDER BY created_at, id) AS rn
  FROM contas
)
UPDATE contas c SET codigo = seq.rn FROM seq WHERE c.id = seq.id;