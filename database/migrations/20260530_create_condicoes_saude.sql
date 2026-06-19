BEGIN;

CREATE TABLE IF NOT EXISTS usuario_condicao_saude (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    assistencia_medica TEXT,
    problema_saude TEXT,
    alergia TEXT,
    medicamento TEXT,
    doencas_anteriores TEXT,
    fratura TEXT,
    cirurgia TEXT,
    deficiencia TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_condicao_saude_usuario_id
    ON usuario_condicao_saude(usuario_id);

COMMIT;
