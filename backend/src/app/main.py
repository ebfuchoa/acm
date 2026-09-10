from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.infrastructure.db.base import Base
from app.infrastructure.db.session import engine
from app.interfaces.api.routers import router

app = FastAPI(title=settings.app_name)

cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
is_development = settings.environment.lower() == "development"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if is_development else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS justificativa_falta"))
            connection.execute(text("DROP TABLE IF EXISTS frequencia"))
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF to_regclass('public.recebimento_doacao') IS NOT NULL
                           AND to_regclass('public.doacao') IS NULL THEN
                            ALTER TABLE recebimento_doacao RENAME TO doacao;
                        END IF;
                    END $$;
                    """
                )
            )
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    ALTER TABLE grupo
                    ADD COLUMN IF NOT EXISTS unidade_social_id INTEGER REFERENCES unidade_social(id)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    UPDATE grupo
                    SET unidade_social_id = COALESCE(
                        (SELECT id FROM unidade_social WHERE id = 2),
                        (SELECT MIN(id) FROM unidade_social)
                    )
                    WHERE unidade_social_id IS NULL
                    """
                )
            )
            connection.execute(text("ALTER TABLE grupo DROP CONSTRAINT IF EXISTS grupo_nome_key"))
            connection.execute(
                text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_unidade_nome_lower
                    ON grupo (unidade_social_id, lower(nome))
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogo_doacao_descricao_lower
                    ON catalogo_doacao (lower(descricao))
                    """
                )
            )
            connection.execute(
                text(
                    """
                    ALTER TABLE registro_atividade_diaria
                    ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES grupo(id)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    ALTER TABLE registro_atividade_diaria
                    ADD COLUMN IF NOT EXISTS unidade_social_id INTEGER REFERENCES unidade_social(id)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    UPDATE registro_atividade_diaria rad
                    SET unidade_social_id = a.unidade_social_id
                    FROM atividade a
                    WHERE rad.atividade_id = a.id
                      AND rad.unidade_social_id IS NULL
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_registro_atividade_diaria_unidade_social
                    ON registro_atividade_diaria (unidade_social_id)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF to_regclass('public.justificativa_frequencia_grupo') IS NOT NULL
                           AND to_regclass('public.frequencia_justificativa_falta') IS NULL THEN
                            ALTER TABLE justificativa_frequencia_grupo RENAME TO frequencia_justificativa_falta;
                        END IF;
                    END $$;
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS frequencia_justificativa_falta (
                        id SERIAL PRIMARY KEY,
                        usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
                        grupo_id INTEGER NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
                        turno VARCHAR(20) NOT NULL,
                        semana_referencia DATE NOT NULL,
                        motivo TEXT NOT NULL,
                        criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                        atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                        CONSTRAINT uq_frequencia_justificativa_falta_semana
                            UNIQUE (usuario_id, grupo_id, turno, semana_referencia)
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF to_regclass('public.justificativa_frequencia_grupo') IS NOT NULL THEN
                            INSERT INTO frequencia_justificativa_falta (
                                usuario_id,
                                grupo_id,
                                turno,
                                semana_referencia,
                                motivo,
                                criado_em,
                                atualizado_em
                            )
                            SELECT
                                usuario_id,
                                grupo_id,
                                turno,
                                semana_referencia,
                                motivo,
                                criado_em,
                                atualizado_em
                            FROM justificativa_frequencia_grupo
                            ON CONFLICT (usuario_id, grupo_id, turno, semana_referencia)
                            DO UPDATE SET
                                motivo = EXCLUDED.motivo,
                                atualizado_em = EXCLUDED.atualizado_em;

                            DROP TABLE justificativa_frequencia_grupo;
                        END IF;
                    END $$;
                    """
                )
            )
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_name = 'frequencia_grupo'
                              AND column_name = 'justificativa_falta'
                        ) THEN
                            INSERT INTO frequencia_justificativa_falta (
                                usuario_id,
                                grupo_id,
                                turno,
                                semana_referencia,
                                motivo
                            )
                            SELECT
                                fg.usuario_id,
                                fg.grupo_id,
                                fg.turno,
                                date_trunc('week', fg.data_frequencia)::date,
                                min(trim(fg.justificativa_falta))
                            FROM frequencia_grupo fg
                            WHERE fg.justificativa_falta IS NOT NULL
                              AND trim(fg.justificativa_falta) <> ''
                            GROUP BY
                                fg.usuario_id,
                                fg.grupo_id,
                                fg.turno,
                                date_trunc('week', fg.data_frequencia)::date
                            ON CONFLICT (usuario_id, grupo_id, turno, semana_referencia)
                            DO UPDATE SET
                                motivo = EXCLUDED.motivo,
                                atualizado_em = now();

                            ALTER TABLE frequencia_grupo DROP COLUMN justificativa_falta;
                        END IF;
                    END $$;
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_frequencia_justificativa_falta_semana
                    ON frequencia_justificativa_falta (grupo_id, turno, semana_referencia)
                    """
                )
            )
            connection.execute(text("CREATE SEQUENCE IF NOT EXISTS ocorrencia_numero_seq START 1"))
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS ocorrencia_categoria (
                        id SERIAL PRIMARY KEY,
                        nome VARCHAR(120) NOT NULL UNIQUE,
                        ativo BOOLEAN NOT NULL DEFAULT TRUE,
                        criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                        atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO ocorrencia_categoria (nome)
                    VALUES
                        ('Atendimento emergencial'),
                        ('Saúde / mal-estar'),
                        ('Acidente'),
                        ('Comportamental'),
                        ('Conflito'),
                        ('Segurança'),
                        ('Incêndio'),
                        ('Infraestrutura'),
                        ('Problema elétrico'),
                        ('Problema hidráulico'),
                        ('Patrimônio'),
                        ('Atendimento não programado'),
                        ('Pessoa externa à ACM'),
                        ('Funcionário'),
                        ('Visitante'),
                        ('Outros')
                    ON CONFLICT (nome) DO NOTHING
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS ocorrencia (
                        id SERIAL PRIMARY KEY,
                        numero VARCHAR(20) NOT NULL UNIQUE,
                        unidade_social_id INTEGER NOT NULL REFERENCES unidade_social(id),
                        data_ocorrencia DATE NOT NULL,
                        turno VARCHAR(20) NOT NULL DEFAULT 'Manhã',
                        local VARCHAR(80) NOT NULL,
                        local_detalhe VARCHAR(150),
                        categoria_id INTEGER NOT NULL REFERENCES ocorrencia_categoria(id),
                        gravidade VARCHAR(20) NOT NULL,
                        descricao TEXT NOT NULL,
                        providencias_tomadas TEXT,
                        status VARCHAR(30) NOT NULL DEFAULT 'Aberta',
                        resolucao TEXT,
                        observacoes_adicionais TEXT,
                        motivo_cancelamento TEXT,
                        criado_por INTEGER NOT NULL REFERENCES colaborador(id),
                        atualizado_por INTEGER REFERENCES colaborador(id),
                        resolvido_por INTEGER REFERENCES colaborador(id),
                        cancelado_por INTEGER REFERENCES colaborador(id),
                        criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                        atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                        resolvido_em TIMESTAMP WITHOUT TIME ZONE,
                        cancelado_em TIMESTAMP WITHOUT TIME ZONE,
                        CONSTRAINT ck_ocorrencia_gravidade CHECK (gravidade IN ('Baixa', 'Média', 'Alta', 'Crítica')),
                        CONSTRAINT ck_ocorrencia_status CHECK (status IN ('Aberta', 'Em acompanhamento', 'Resolvida', 'Cancelada'))
                    )
                    """
                )
            )
            connection.execute(text("ALTER TABLE ocorrencia ADD COLUMN IF NOT EXISTS turno VARCHAR(20) NOT NULL DEFAULT 'Manhã'"))
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_name = 'ocorrencia'
                              AND column_name = 'hora_ocorrencia'
                        ) THEN
                            ALTER TABLE ocorrencia ALTER COLUMN hora_ocorrencia DROP NOT NULL;
                        END IF;
                    END $$;
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS ocorrencia_pessoa (
                        id SERIAL PRIMARY KEY,
                        ocorrencia_id INTEGER NOT NULL REFERENCES ocorrencia(id) ON DELETE CASCADE,
                        tipo_pessoa VARCHAR(40) NOT NULL,
                        usuario_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
                        nome_pessoa VARCHAR(200),
                        observacao TEXT
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS ocorrencia_servico_externo (
                        id SERIAL PRIMARY KEY,
                        ocorrencia_id INTEGER NOT NULL REFERENCES ocorrencia(id) ON DELETE CASCADE,
                        tipo_servico VARCHAR(80) NOT NULL,
                        nome_servico VARCHAR(120),
                        horario_acionamento TIME,
                        protocolo VARCHAR(80),
                        observacao TEXT
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS ocorrencia_colaborador (
                        id SERIAL PRIMARY KEY,
                        ocorrencia_id INTEGER NOT NULL REFERENCES ocorrencia(id) ON DELETE CASCADE,
                        colaborador_id INTEGER NOT NULL REFERENCES colaborador(id) ON DELETE CASCADE,
                        CONSTRAINT uq_ocorrencia_colaborador UNIQUE (ocorrencia_id, colaborador_id)
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS ocorrencia_historico (
                        id SERIAL PRIMARY KEY,
                        ocorrencia_id INTEGER NOT NULL REFERENCES ocorrencia(id) ON DELETE CASCADE,
                        acao VARCHAR(80) NOT NULL,
                        descricao TEXT NOT NULL,
                        realizado_por INTEGER REFERENCES colaborador(id),
                        criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
                    )
                    """
                )
            )
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ocorrencia_unidade_status ON ocorrencia (unidade_social_id, status)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ocorrencia_data ON ocorrencia (data_ocorrencia DESC)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ocorrencia_categoria ON ocorrencia (categoria_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ocorrencia_pessoa_usuario ON ocorrencia_pessoa (usuario_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ocorrencia_historico_ocorrencia ON ocorrencia_historico (ocorrencia_id)"))
            connection.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_catalogo_doacao_descricao
                    ON catalogo_doacao (descricao)
                    """
                )
            )
            connection.execute(text("ALTER TABLE catalogo_doacao DROP COLUMN IF EXISTS ativo"))
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF to_regclass('public.recebimento_doacao') IS NOT NULL
                           AND to_regclass('public.doacao') IS NULL THEN
                            ALTER TABLE recebimento_doacao RENAME TO doacao;
                        END IF;
                    END $$;
                    """
                )
            )
            connection.execute(text("ALTER TABLE doacao ALTER COLUMN item_ns DROP NOT NULL"))
            connection.execute(text("ALTER TABLE doacao ALTER COLUMN quilograma_kg DROP NOT NULL"))
            connection.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_doacao_catalogo
                    ON doacao (catalogo_doacao_id)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_doacao_data
                    ON doacao (data_doacao)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_doacao_nome_doador
                    ON doacao (nome_doador)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'doacao'
                              AND column_name = 'quantidade_numero'
                        ) AND NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'doacao'
                              AND column_name = 'item_ns'
                        ) THEN
                            ALTER TABLE doacao RENAME COLUMN quantidade_numero TO item_ns;
                        END IF;
                    END $$;
                    """
                )
            )
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'doacao'
                              AND column_name = 'quantidade_kg_itens'
                        ) AND NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'doacao'
                              AND column_name = 'quilograma_kg'
                        ) THEN
                            ALTER TABLE doacao RENAME COLUMN quantidade_kg_itens TO quilograma_kg;
                        END IF;
                    END $$;
                    """
                )
            )


app.include_router(router)
