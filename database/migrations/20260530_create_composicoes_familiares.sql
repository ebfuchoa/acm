BEGIN;

CREATE TABLE IF NOT EXISTS composicoes_familiares (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    parentesco VARCHAR(80) NOT NULL,
    sexo VARCHAR(20) NOT NULL,
    idade INTEGER NOT NULL,
    naturalidade VARCHAR(150) NOT NULL,
    estado_civil VARCHAR(40) NOT NULL,
    escolaridade VARCHAR(120) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_composicoes_familiares_usuario_id
    ON composicoes_familiares(usuario_id);

COMMIT;
