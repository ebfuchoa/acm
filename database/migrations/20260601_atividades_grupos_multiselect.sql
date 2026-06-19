CREATE TABLE IF NOT EXISTS atividade_grupo (
    id SERIAL PRIMARY KEY,
    atividade_id INTEGER NOT NULL REFERENCES atividade(id) ON DELETE CASCADE,
    grupo_id INTEGER NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
    CONSTRAINT uq_atividade_grupo UNIQUE (atividade_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_atividade_grupo_atividade_id
ON atividade_grupo (atividade_id);

CREATE INDEX IF NOT EXISTS idx_atividade_grupo_grupo_id
ON atividade_grupo (grupo_id);

INSERT INTO atividade_grupo (atividade_id, grupo_id)
SELECT a.id, a.grupo_id
FROM atividade a
WHERE a.grupo_id IS NOT NULL
ON CONFLICT (atividade_id, grupo_id) DO NOTHING;
