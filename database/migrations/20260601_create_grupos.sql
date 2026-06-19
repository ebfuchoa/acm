CREATE TABLE IF NOT EXISTS grupo (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  turno VARCHAR(50) NOT NULL,
  idade_inicial INTEGER NOT NULL,
  idade_final INTEGER NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_grupo_idade_inicial_non_negative CHECK (idade_inicial >= 0),
  CONSTRAINT chk_grupo_idade_final_non_negative CHECK (idade_final >= 0),
  CONSTRAINT chk_grupo_idade_range CHECK (idade_final >= idade_inicial)
);

CREATE INDEX IF NOT EXISTS idx_grupo_nome ON grupo (nome);
CREATE INDEX IF NOT EXISTS idx_grupo_turno ON grupo (turno);
CREATE INDEX IF NOT EXISTS idx_grupo_idade_inicial ON grupo (idade_inicial);
CREATE INDEX IF NOT EXISTS idx_grupo_idade_final ON grupo (idade_final);
