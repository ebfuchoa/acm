DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'usuarios'
          AND column_name = 'full_name'
    ) THEN
        ALTER TABLE usuarios DROP COLUMN full_name;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass
          AND conname = 'uq_usuarios_rg'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT uq_usuarios_rg UNIQUE (rg);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass
          AND conname = 'uq_usuarios_numero_nis'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT uq_usuarios_numero_nis UNIQUE (numero_nis);
    END IF;
END $$;

