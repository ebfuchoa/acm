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


app.include_router(router)
