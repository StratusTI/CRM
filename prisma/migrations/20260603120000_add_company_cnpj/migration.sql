-- Adiciona o CNPJ da empresa (opcional, único por workspace) e passa a aceitar
-- empresas sem nome no momento da criação — a linha pode nascer só com o CNPJ
-- e ter a razão social/nome fantasia preenchidos pela consulta à BrasilAPI.
ALTER TABLE "companies" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "companies" ALTER COLUMN "name" SET DEFAULT '';

CREATE UNIQUE INDEX "companies_workspace_id_cnpj_key" ON "companies"("workspace_id", "cnpj");
