ALTER TABLE IF EXISTS usuarios
    ALTER COLUMN nome_pai DROP NOT NULL,
    ALTER COLUMN nome_mae DROP NOT NULL,
    ALTER COLUMN responsavel_observacao DROP NOT NULL,
    ALTER COLUMN residencial_complemento DROP NOT NULL,
    ALTER COLUMN residencial_contato_familia DROP NOT NULL,
    ALTER COLUMN escolaridade_observacao DROP NOT NULL;

