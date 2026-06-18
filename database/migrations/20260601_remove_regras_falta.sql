DELETE FROM perfis_permissoes
WHERE permissao_id IN (
  SELECT id FROM permissoes WHERE codigo IN ('absence-rules.read', 'absence-rules.write', 'absence-rules.delete')
);

DELETE FROM permissoes
WHERE codigo IN ('absence-rules.read', 'absence-rules.write', 'absence-rules.delete');

DROP TABLE IF EXISTS regras_falta;
