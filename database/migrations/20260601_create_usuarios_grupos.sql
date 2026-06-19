CREATE TABLE IF NOT EXISTS usuario_grupo (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    grupo_id INTEGER NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_grupo UNIQUE (usuario_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_grupo_usuario_id
ON usuario_grupo (usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuario_grupo_grupo_id
ON usuario_grupo (grupo_id);
