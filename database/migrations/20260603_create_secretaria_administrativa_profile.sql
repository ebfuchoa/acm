INSERT INTO perfis (nome, descricao)
SELECT 'Secretária Administrativa', 'Gestão Administrativa'
WHERE NOT EXISTS (
  SELECT 1
  FROM perfis
  WHERE LOWER(nome) = LOWER('Secretária Administrativa')
);

DELETE FROM perfis_permissoes
WHERE perfil_id IN (
  SELECT id
  FROM perfis
  WHERE LOWER(nome) IN (LOWER('Secretária Administrativa'), LOWER('Secretária Executiva'))
);

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo IN (
  'units.read',
  'units.write',
  'units.delete',
  'collaborators.read',
  'collaborators.write',
  'collaborators.delete'
)
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) IN (LOWER('Secretária Administrativa'), LOWER('Secretária Executiva'))
  AND pp.id IS NULL;
