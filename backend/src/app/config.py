from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ACM Social Management API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://acm:admin123@localhost:5432/acm"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    jwt_secret_key: str = "acm-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 480

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
