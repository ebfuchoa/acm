CREATE TABLE IF NOT EXISTS usuario_responsavel (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    idade INTEGER NOT NULL,
    sexo VARCHAR(20) NOT NULL,
    naturalidade VARCHAR(150) NOT NULL,
    estado_civil VARCHAR(20) NOT NULL,
    escolaridade VARCHAR(120) NOT NULL,
    rg VARCHAR(20) NOT NULL,
    orgao_emissor_uf VARCHAR(40) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    local_trabalho VARCHAR(180) NULL,
    renda_bruta NUMERIC(12, 2) NULL,
    estado VARCHAR(2) NULL,
    municipio VARCHAR(100) NULL,
    telefone VARCHAR(20) NULL,
    horario VARCHAR(20) NULL,
    observacao TEXT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario_residencial (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    logradouro VARCHAR(200) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100) NULL,
    bairro VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    cep VARCHAR(9) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    contato_familia TEXT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario_escolaridade (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    serie VARCHAR(40) NOT NULL,
    ensino VARCHAR(20) NOT NULL,
    esta_cursando VARCHAR(3) NOT NULL,
    nome_escola VARCHAR(200) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    e_bolsista VARCHAR(3) NOT NULL,
    percentual_bolsa INTEGER NULL,
    horario VARCHAR(20) NOT NULL,
    observacao TEXT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO usuario_responsavel (
    usuario_id,
    nome,
    idade,
    sexo,
    naturalidade,
    estado_civil,
    escolaridade,
    rg,
    orgao_emissor_uf,
    cpf,
    local_trabalho,
    renda_bruta,
    estado,
    municipio,
    telefone,
    horario,
    observacao,
    criado_em,
    atualizado_em
)
SELECT
    id,
    responsavel_nome,
    responsavel_idade,
    responsavel_sexo,
    responsavel_naturalidade,
    responsavel_estado_civil,
    responsavel_escolaridade,
    responsavel_rg,
    responsavel_orgao_emissor_uf,
    responsavel_cpf,
    responsavel_local_trabalho,
    responsavel_renda_bruta,
    responsavel_estado,
    responsavel_municipio,
    responsavel_telefone,
    responsavel_horario,
    responsavel_observacao,
    criado_em,
    atualizado_em
FROM usuario
WHERE NOT EXISTS (
    SELECT 1
    FROM usuario_responsavel
    WHERE usuario_responsavel.usuario_id = usuario.id
);

INSERT INTO usuario_residencial (
    usuario_id,
    logradouro,
    numero,
    complemento,
    bairro,
    municipio,
    cep,
    telefone,
    contato_familia,
    criado_em,
    atualizado_em
)
SELECT
    id,
    residencial_logradouro,
    residencial_numero,
    residencial_complemento,
    residencial_bairro,
    residencial_municipio,
    residencial_cep,
    residencial_telefone,
    residencial_contato_familia,
    criado_em,
    atualizado_em
FROM usuario
WHERE NOT EXISTS (
    SELECT 1
    FROM usuario_residencial
    WHERE usuario_residencial.usuario_id = usuario.id
);

INSERT INTO usuario_escolaridade (
    usuario_id,
    serie,
    ensino,
    esta_cursando,
    nome_escola,
    tipo,
    e_bolsista,
    percentual_bolsa,
    horario,
    observacao,
    criado_em,
    atualizado_em
)
SELECT
    id,
    escolaridade_serie,
    escolaridade_ensino,
    escolaridade_esta_cursando,
    escolaridade_nome_escola,
    escolaridade_tipo,
    escolaridade_e_bolsista,
    escolaridade_percentual_bolsa,
    escolaridade_horario,
    escolaridade_observacao,
    criado_em,
    atualizado_em
FROM usuario
WHERE NOT EXISTS (
    SELECT 1
    FROM usuario_escolaridade
    WHERE usuario_escolaridade.usuario_id = usuario.id
);

ALTER TABLE usuario
    DROP COLUMN IF EXISTS responsavel_nome,
    DROP COLUMN IF EXISTS responsavel_idade,
    DROP COLUMN IF EXISTS responsavel_sexo,
    DROP COLUMN IF EXISTS responsavel_naturalidade,
    DROP COLUMN IF EXISTS responsavel_estado_civil,
    DROP COLUMN IF EXISTS responsavel_escolaridade,
    DROP COLUMN IF EXISTS responsavel_rg,
    DROP COLUMN IF EXISTS responsavel_orgao_emissor_uf,
    DROP COLUMN IF EXISTS responsavel_cpf,
    DROP COLUMN IF EXISTS responsavel_local_trabalho,
    DROP COLUMN IF EXISTS responsavel_renda_bruta,
    DROP COLUMN IF EXISTS responsavel_estado,
    DROP COLUMN IF EXISTS responsavel_municipio,
    DROP COLUMN IF EXISTS responsavel_telefone,
    DROP COLUMN IF EXISTS responsavel_horario,
    DROP COLUMN IF EXISTS responsavel_observacao,
    DROP COLUMN IF EXISTS residencial_logradouro,
    DROP COLUMN IF EXISTS residencial_numero,
    DROP COLUMN IF EXISTS residencial_complemento,
    DROP COLUMN IF EXISTS residencial_bairro,
    DROP COLUMN IF EXISTS residencial_municipio,
    DROP COLUMN IF EXISTS residencial_cep,
    DROP COLUMN IF EXISTS residencial_telefone,
    DROP COLUMN IF EXISTS residencial_contato_familia,
    DROP COLUMN IF EXISTS escolaridade_serie,
    DROP COLUMN IF EXISTS escolaridade_ensino,
    DROP COLUMN IF EXISTS escolaridade_esta_cursando,
    DROP COLUMN IF EXISTS escolaridade_nome_escola,
    DROP COLUMN IF EXISTS escolaridade_tipo,
    DROP COLUMN IF EXISTS escolaridade_e_bolsista,
    DROP COLUMN IF EXISTS escolaridade_percentual_bolsa,
    DROP COLUMN IF EXISTS escolaridade_horario,
    DROP COLUMN IF EXISTS escolaridade_observacao;
