ALTER TABLE atividade
ADD COLUMN IF NOT EXISTS grupo_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_atividade_grupo_id'
          AND table_name = 'atividade'
    ) THEN
        ALTER TABLE atividade
        ADD CONSTRAINT fk_atividade_grupo_id
        FOREIGN KEY (grupo_id) REFERENCES grupo(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_atividade_grupo_id
ON atividade(grupo_id);
