-- Backfill: libera os campos com unicidade (cnpj/domain) das empresas já
-- soft-deleted. O índice único (workspace_id, cnpj)/(workspace_id, domain)
-- conta linhas deletadas, então valores presos em registros soft-deleted
-- impediam recadastrar a mesma empresa (violação P2002 -> 500). A partir de
-- agora o soft-delete já limpa esses campos; este UPDATE corrige o histórico.
UPDATE "companies"
SET "cnpj" = NULL, "domain" = NULL
WHERE "deleted_at" IS NOT NULL
  AND ("cnpj" IS NOT NULL OR "domain" IS NOT NULL);