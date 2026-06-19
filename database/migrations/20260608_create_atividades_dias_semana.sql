CREATE TABLE IF NOT EXISTS atividade_dia_semana (
    id SERIAL PRIMARY KEY,
    atividade_id INTEGER NOT NULL REFERENCES atividade(id) ON DELETE CASCADE,
    dia_semana VARCHAR(20) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_atividade_dia_semana_dia
        CHECK (dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta')),
    CONSTRAINT uq_atividade_dia_semana UNIQUE (atividade_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_atividade_dia_semana_atividade_id
ON atividade_dia_semana (atividade_id);

CREATE INDEX IF NOT EXISTS idx_atividade_dia_semana_dia_semana
ON atividade_dia_semana (dia_semana);
