CREATE INDEX "caixa_mov_nucleo_idx" ON "caixa_movimentos" USING btree ("nucleo_id");--> statement-breakpoint
CREATE INDEX "caixa_mov_expediente_idx" ON "caixa_movimentos" USING btree ("expediente_id");--> statement-breakpoint
CREATE INDEX "cobrancas_conta_idx" ON "cobrancas" USING btree ("conta_id");--> statement-breakpoint
CREATE INDEX "contas_titular_idx" ON "contas" USING btree ("titular_pessoa_id");--> statement-breakpoint
CREATE INDEX "corte_itens_corte_idx" ON "corte_itens" USING btree ("corte_id");--> statement-breakpoint
CREATE INDEX "devolucoes_venda_idx" ON "devolucoes" USING btree ("venda_id");--> statement-breakpoint
CREATE INDEX "devolucoes_expediente_idx" ON "devolucoes" USING btree ("expediente_id");--> statement-breakpoint
CREATE INDEX "estoque_mov_produto_idx" ON "estoque_movimentos" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "expedientes_nucleo_status_idx" ON "expedientes" USING btree ("nucleo_id","status");--> statement-breakpoint
CREATE INDEX "lancamentos_conta_idx" ON "lancamentos" USING btree ("conta_id");--> statement-breakpoint
CREATE INDEX "lancamentos_venda_idx" ON "lancamentos" USING btree ("venda_id");--> statement-breakpoint
CREATE INDEX "pagamentos_venda_idx" ON "pagamentos" USING btree ("venda_id");--> statement-breakpoint
CREATE INDEX "venda_itens_venda_idx" ON "venda_itens" USING btree ("venda_id");--> statement-breakpoint
CREATE INDEX "vendas_nucleo_data_idx" ON "vendas" USING btree ("nucleo_id","occurred_at");--> statement-breakpoint
CREATE INDEX "vendas_expediente_idx" ON "vendas" USING btree ("expediente_id");--> statement-breakpoint
CREATE INDEX "vendas_conta_idx" ON "vendas" USING btree ("conta_id");