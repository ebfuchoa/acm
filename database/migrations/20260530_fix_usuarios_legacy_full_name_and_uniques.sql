DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'usuario'
          AND column_name = 'full_name'
    ) THEN
        ALTER TABLE usuario DROP COLUMN full_name;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'usuario'::regclass
          AND conname = 'uq_usuario_rg'
    ) THEN
        ALTER TABLE usuario ADD CONSTRAINT uq_usuario_rg UNIQUE (rg);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'usuario'::regclass
          AND conname = 'uq_usuario_numero_nis'
    ) THEN
        ALTER TABLE usuario ADD CONSTRAINT uq_usuario_numero_nis UNIQUE (numero_nis);
    END IF;
END $$;

