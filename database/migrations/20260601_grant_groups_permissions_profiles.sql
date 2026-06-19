INSERT INTO permissoes (codigo, descricao)
SELECT 'groups.read', 'Permite visualizar grupo'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'groups.read');

INSERT INTO permissoes (codigo, descricao)
SELECT 'groups.write', 'Permite cadastrar e editar grupo'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'groups.write');

INSERT INTO permissoes (codigo, descricao)
SELECT 'groups.delete', 'Permite excluir grupo'
WHERE NOT EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'groups.delete');

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo = 'groups.read'
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador', 'coordenador', 'tecnico')
  AND pp.id IS NULL;

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo = 'groups.write'
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador', 'coordenador')
  AND pp.id IS NULL;

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo = 'groups.delete'
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN ('administrador')
  AND pp.id IS NULL;
