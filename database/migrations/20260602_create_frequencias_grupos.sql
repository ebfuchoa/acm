CREATE TABLE IF NOT EXISTS frequencias_grupos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  turno VARCHAR(20) NOT NULL,
  data_frequencia DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_frequencia_grupo UNIQUE (usuario_id, grupo_id, turno, data_frequencia)
);

CREATE INDEX IF NOT EXISTS idx_frequencias_grupos_grupo_turno_data
  ON frequencias_grupos (grupo_id, turno, data_frequencia);
