DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimentacao_usuario') THEN
        CREATE TYPE tipo_movimentacao_usuario AS ENUM ('ENTRADA', 'SAIDA');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS usuario_movimentacao (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuario(id),
    movement_type tipo_movimentacao_usuario NOT NULL,
    movement_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_usuario_movimentacao_user_id
    ON usuario_movimentacao (user_id);

CREATE INDEX IF NOT EXISTS ix_usuario_movimentacao_movement_type
    ON usuario_movimentacao (movement_type);

CREATE INDEX IF NOT EXISTS ix_usuario_movimentacao_movement_date
    ON usuario_movimentacao (movement_date);

CREATE INDEX IF NOT EXISTS ix_usuario_movimentacao_user_type_date
    ON usuario_movimentacao (user_id, movement_type, movement_date);
