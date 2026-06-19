ALTER TABLE atividade
ADD COLUMN IF NOT EXISTS descricao TEXT;

ALTER TABLE atividade
ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE atividade
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_atividade_nome ON atividade (nome);
CREATE INDEX IF NOT EXISTS idx_atividade_nome_lower ON atividade ((LOWER(nome)));
