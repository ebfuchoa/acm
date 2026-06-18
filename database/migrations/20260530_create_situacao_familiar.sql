BEGIN;

CREATE TABLE IF NOT EXISTS situacao_familiar (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    informacoes_situacao_familiar TEXT,
    expectativas_participacao_projeto TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_situacao_familiar_usuario_id
    ON situacao_familiar(usuario_id);

COMMIT;
