INSERT INTO perfis (nome, descricao)
SELECT 'Educador(a)', 'Operação de frequência'
WHERE NOT EXISTS (
  SELECT 1
  FROM perfis
  WHERE LOWER(nome) = LOWER('Educador(a)')
);

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo IN ('activities.read', 'groups.read')
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) = LOWER('Educador(a)')
  AND pp.id IS NULL;
