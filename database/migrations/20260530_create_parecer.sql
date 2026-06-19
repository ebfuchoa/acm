BEGIN;

CREATE TABLE IF NOT EXISTS usuario_parecer (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    parecer TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parecer_usuario_id
    ON usuario_parecer(usuario_id);

COMMIT;
