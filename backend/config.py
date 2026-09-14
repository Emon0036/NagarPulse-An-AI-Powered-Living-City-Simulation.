import os
from dataclasses import dataclass

@dataclass
class Config:
    # Aiven MySQL Cloud Server configuration
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "mysql-32b82b88-emonk42065-ek.f.aivencloud.com")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "19204"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "avnadmin")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "<redacted>")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "defaultdb")
    MYSQL_SSL_REQUIRED: bool = True

    # Local fallback SQLite database
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "ecosim_local.db")

    # Simulation defaults
    DEFAULT_AGENT_COUNT: int = 120
    DEFAULT_FOOD_PRICE_INDEX: float = 1.0
    DEFAULT_TAX_RATE: float = 0.10
    DEFAULT_INFLATION_RATE: float = 0.05
    CURRENCY_SYMBOL: str = "BDT"

config = Config()
