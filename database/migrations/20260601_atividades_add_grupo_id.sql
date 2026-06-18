ALTER TABLE atividades
ADD COLUMN IF NOT EXISTS grupo_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_atividades_grupo_id'
          AND table_name = 'atividades'
    ) THEN
        ALTER TABLE atividades
        ADD CONSTRAINT fk_atividades_grupo_id
        FOREIGN KEY (grupo_id) REFERENCES grupos(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_atividades_grupo_id
ON atividades(grupo_id);
