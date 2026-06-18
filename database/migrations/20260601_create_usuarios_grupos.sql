CREATE TABLE IF NOT EXISTS usuarios_grupos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_grupo UNIQUE (usuario_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_grupos_usuario_id
ON usuarios_grupos (usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_grupos_grupo_id
ON usuarios_grupos (grupo_id);
