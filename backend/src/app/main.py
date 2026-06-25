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
