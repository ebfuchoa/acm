BEGIN;

CREATE TABLE IF NOT EXISTS usuario_situacao_familiar (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    informacoes_usuario_situacao_familiar TEXT,
    expectativas_participacao_projeto TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_situacao_familiar_usuario_id
    ON usuario_situacao_familiar(usuario_id);

COMMIT;
