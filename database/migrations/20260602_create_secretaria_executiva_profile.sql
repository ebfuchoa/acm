INSERT INTO perfis (nome, descricao)
SELECT 'Secretária Executiva', 'Gestão Geral'
WHERE NOT EXISTS (
  SELECT 1
  FROM perfis
  WHERE LOWER(nome) = LOWER('Secretária Executiva')
);

INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
CROSS JOIN permissoes pm
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE LOWER(p.nome) = LOWER('Secretária Executiva')
  AND pp.id IS NULL;
