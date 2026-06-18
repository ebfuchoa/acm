CREATE TABLE IF NOT EXISTS grupos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  turno VARCHAR(50) NOT NULL,
  idade_inicial INTEGER NOT NULL,
  idade_final INTEGER NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_grupos_idade_inicial_non_negative CHECK (idade_inicial >= 0),
  CONSTRAINT chk_grupos_idade_final_non_negative CHECK (idade_final >= 0),
  CONSTRAINT chk_grupos_idade_range CHECK (idade_final >= idade_inicial)
);

CREATE INDEX IF NOT EXISTS idx_grupos_nome ON grupos (nome);
CREATE INDEX IF NOT EXISTS idx_grupos_turno ON grupos (turno);
CREATE INDEX IF NOT EXISTS idx_grupos_idade_inicial ON grupos (idade_inicial);
CREATE INDEX IF NOT EXISTS idx_grupos_idade_final ON grupos (idade_final);
