CREATE TABLE IF NOT EXISTS atividades_grupos (
    id SERIAL PRIMARY KEY,
    atividade_id INTEGER NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
    grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT uq_atividade_grupo UNIQUE (atividade_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_atividades_grupos_atividade_id
ON atividades_grupos (atividade_id);

CREATE INDEX IF NOT EXISTS idx_atividades_grupos_grupo_id
ON atividades_grupos (grupo_id);

INSERT INTO atividades_grupos (atividade_id, grupo_id)
SELECT a.id, a.grupo_id
FROM atividades a
WHERE a.grupo_id IS NOT NULL
ON CONFLICT (atividade_id, grupo_id) DO NOTHING;
