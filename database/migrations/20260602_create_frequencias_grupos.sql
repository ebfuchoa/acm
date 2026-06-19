CREATE TABLE IF NOT EXISTS frequencia_grupo (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  grupo_id INTEGER NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  turno VARCHAR(20) NOT NULL,
  data_frequencia DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_frequencia_grupo UNIQUE (usuario_id, grupo_id, turno, data_frequencia)
);

CREATE INDEX IF NOT EXISTS idx_frequencia_grupo_grupo_turno_data
  ON frequencia_grupo (grupo_id, turno, data_frequencia);
