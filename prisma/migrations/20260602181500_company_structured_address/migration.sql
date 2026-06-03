-- Converte `companies.address` de texto livre para JSON estruturado
-- (cep, logradouro, número, complemento, bairro, cidade, UF e coordenadas).
-- Endereços já existentes (texto) são preservados no campo `street`.
ALTER TABLE "companies"
  ALTER COLUMN "address" TYPE JSONB
  USING (
    CASE
      WHEN "address" IS NULL THEN NULL
      ELSE jsonb_build_object('street', "address")
    END
  );
