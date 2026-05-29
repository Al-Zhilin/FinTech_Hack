from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    PROJECT_NAME: str = "HackathonBack"
    VERSION: str = "0.1.0"
    DEBUG: bool = False

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    AI_SERVICE_URL: str = "http://localhost:8001"
    CA_CERT_PATH: str = "certs/ca.crt"
    AI_SSL_VERIFY: bool = False

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "hackathon"

    @property
    def httpx_verify(self) -> str | bool:
        if not self.AI_SSL_VERIFY:
            return False
        path = Path(self.CA_CERT_PATH)
        return str(path) if path.exists() else False


settings = Settings()
