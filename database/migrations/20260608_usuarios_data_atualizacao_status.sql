ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS data_atualizacao_status TIMESTAMP NULL;

UPDATE usuarios
SET data_atualizacao_status = COALESCE(data_atualizacao_status, atualizado_em)
WHERE status::text = 'inativo';
