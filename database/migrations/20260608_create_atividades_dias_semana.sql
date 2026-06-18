CREATE TABLE IF NOT EXISTS atividades_dias_semana (
    id SERIAL PRIMARY KEY,
    atividade_id INTEGER NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
    dia_semana VARCHAR(20) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_atividades_dias_semana_dia
        CHECK (dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta')),
    CONSTRAINT uq_atividade_dia_semana UNIQUE (atividade_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_atividades_dias_semana_atividade_id
ON atividades_dias_semana (atividade_id);

CREATE INDEX IF NOT EXISTS idx_atividades_dias_semana_dia_semana
ON atividades_dias_semana (dia_semana);
