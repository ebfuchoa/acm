INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM perfis p
JOIN permissoes pm ON pm.codigo IN ('users.write')
LEFT JOIN perfis_permissoes pp ON pp.perfil_id = p.id AND pp.permissao_id = pm.id
WHERE p.nome IN ('Coordenador', 'Tecnico')
  AND pp.id IS NULL;

