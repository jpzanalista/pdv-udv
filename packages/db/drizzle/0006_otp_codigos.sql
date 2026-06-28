CREATE TABLE "otp_codigos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"consumido_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_codigos" ADD CONSTRAINT "otp_codigos_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;