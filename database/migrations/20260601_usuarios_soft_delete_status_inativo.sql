DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatus') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'userstatus'
              AND e.enumlabel = 'inativo'
        ) THEN
            ALTER TYPE userstatus ADD VALUE 'inativo';
        END IF;
    END IF;
END $$;

UPDATE usuarios
SET status = 'inativo'
WHERE status::text IN ('suspenso', 'desligado');
