INSERT INTO permissoes (codigo, descricao)
SELECT 'activities.read', 'Permite visualizar atividade'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'activities.read');

INSERT INTO permissoes (codigo, descricao)
SELECT 'activities.write', 'Permite cadastrar e editar atividade'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'activities.write');

INSERT INTO permissoes (codigo, descricao)
SELECT 'activities.delete', 'Permite excluir atividade'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'activities.delete');

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo = 'activities.read'
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador', 'coordenador', 'tecnico')
  AND pp.id IS NULL;

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo = 'activities.write'
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador', 'coordenador')
  AND pp.id IS NULL;

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo = 'activities.delete'
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador')
  AND pp.id IS NULL;
