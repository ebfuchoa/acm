ALTER TABLE atividades
ADD COLUMN IF NOT EXISTS descricao TEXT;

ALTER TABLE atividades
ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE atividades
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_atividades_nome ON atividades (nome);
CREATE INDEX IF NOT EXISTS idx_atividades_nome_lower ON atividades ((LOWER(nome)));
