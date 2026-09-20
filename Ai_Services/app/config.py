import logging
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Centralized environment configuration. Never log or expose these values."""

    def __init__(self):
        self.PORT = int(os.getenv("PORT", "8000"))
        self.BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
        self.FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
        self.GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        # Dedicated backend "user" account this service authenticates as, so it
        # can call the Node backend's protected APIs the same way any other
        # client would (no direct DB access, no bypassing auth).
        self.BACKEND_SERVICE_EMAIL = os.getenv("BACKEND_SERVICE_EMAIL", "")
        self.BACKEND_SERVICE_PASSWORD = os.getenv("BACKEND_SERVICE_PASSWORD", "")
        self.BACKEND_SERVICE_NAME = os.getenv("BACKEND_SERVICE_NAME", "AeroResolve AI Service")


settings = Settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
