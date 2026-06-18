ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS rg_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS turno VARCHAR(20);

UPDATE usuarios
SET rg_uf = COALESCE(NULLIF(rg_uf, ''), 'SP')
WHERE rg_uf IS NULL OR rg_uf = '';

UPDATE usuarios
SET turno = COALESCE(NULLIF(turno, ''), 'Manhã')
WHERE turno IS NULL OR turno = '';

ALTER TABLE usuarios
ALTER COLUMN rg_uf SET NOT NULL,
ALTER COLUMN turno SET NOT NULL;

ALTER TABLE usuarios
ALTER COLUMN responsavel_local_trabalho DROP NOT NULL,
ALTER COLUMN responsavel_renda_bruta DROP NOT NULL,
ALTER COLUMN responsavel_estado DROP NOT NULL,
ALTER COLUMN responsavel_municipio DROP NOT NULL,
ALTER COLUMN responsavel_telefone DROP NOT NULL,
ALTER COLUMN responsavel_horario DROP NOT NULL;
