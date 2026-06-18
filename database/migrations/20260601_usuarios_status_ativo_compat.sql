DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatus') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'userstatus'
              AND e.enumlabel = 'ativo'
        ) THEN
            ALTER TYPE userstatus ADD VALUE 'ativo';
        END IF;
    END IF;
END $$;

UPDATE usuarios
SET status = 'ativo'
WHERE status::text <> 'inativo';
