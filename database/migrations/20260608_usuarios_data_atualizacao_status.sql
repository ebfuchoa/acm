ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS data_atualizacao_status TIMESTAMP NULL;

UPDATE usuario
SET data_atualizacao_status = COALESCE(data_atualizacao_status, atualizado_em)
WHERE status::text = 'inativo';
