CREATE TABLE IF NOT EXISTS atendimentos (
  id SERIAL PRIMARY KEY,
  unidade_social_id INTEGER NOT NULL REFERENCES unidades_sociais(id),
  colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE SET NULL,
  atendente_nome VARCHAR(200) NOT NULL DEFAULT 'Não informado',
  atendente_funcao VARCHAR(80) NOT NULL DEFAULT 'Não informado',
  data_atendimento DATE NOT NULL,
  nome VARCHAR(200) NOT NULL,
  demanda TEXT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE SET NULL;

ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS atendente_nome VARCHAR(200) NOT NULL DEFAULT 'Não informado';

ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS atendente_funcao VARCHAR(80) NOT NULL DEFAULT 'Não informado';

CREATE INDEX IF NOT EXISTS idx_atendimentos_unidade_social_id
  ON atendimentos (unidade_social_id);

CREATE INDEX IF NOT EXISTS idx_atendimentos_colaborador_id
  ON atendimentos (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_atendimentos_data_atendimento
  ON atendimentos (data_atendimento);

CREATE INDEX IF NOT EXISTS idx_atendimentos_nome
  ON atendimentos (nome);

INSERT INTO permissoes (codigo, descricao)
SELECT 'atendimentos.read', 'Permite visualizar atendimentos'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'atendimentos.read');

INSERT INTO permissoes (codigo, descricao)
SELECT 'atendimentos.write', 'Permite cadastrar e editar atendimentos'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'atendimentos.write');

INSERT INTO permissoes (codigo, descricao)
SELECT 'atendimentos.delete', 'Permite excluir atendimentos'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'atendimentos.delete');

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo = 'atendimentos.read'
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador', 'coordenador', 'tecnico')
  AND pp.id IS NULL;

DELETE FROM perfis_permissoes
WHERE perfil_id IN (
  SELECT id FROM perfis WHERE LOWER(nome) NOT IN ('administrador', 'coordenador', 'tecnico')
)
AND permissao_id IN (
  SELECT id FROM permissoes WHERE codigo IN ('atendimentos.write', 'atendimentos.delete')
);

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo IN ('atendimentos.write', 'atendimentos.delete')
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador', 'coordenador', 'tecnico')
  AND pp.id IS NULL;
