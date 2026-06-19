BEGIN;

CREATE TABLE IF NOT EXISTS usuario_situacao_habitacional (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    tipo_habitacao VARCHAR(40),
    tipo_habitacao_outro VARCHAR(120),
    ocupacao VARCHAR(60),
    valor_imovel_em_pagamento NUMERIC(12,2),
    valor_aluguel NUMERIC(12,2),
    ocupacao_outro VARCHAR(120),
    numero_comodos VARCHAR(20),
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_situacao_habitacional_usuario_id
    ON usuario_situacao_habitacional(usuario_id);

COMMIT;
