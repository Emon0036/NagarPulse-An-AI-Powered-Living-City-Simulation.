import os
import sqlite3
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EcoSimDB")

class DatabaseManager:
    """
    Manages persistence with dual support:
    Primary: Aiven Cloud MySQL with SSL.
    Fallback: Local SQLite database.
    """
    def __init__(self):
        self.db_type = "none"
        self.mysql_error = None
        self.connection = None
        self.init_db()

    def get_mysql_connection(self):
        try:
            import mysql.connector
            conn = mysql.connector.connect(
                host=config.MYSQL_HOST,
                port=config.MYSQL_PORT,
                user=config.MYSQL_USER,
                password=config.MYSQL_PASSWORD,
                database=config.MYSQL_DATABASE,
                ssl_disabled=False,
                connection_timeout=5
            )
            return conn
        except Exception as e:
            self.mysql_error = str(e)
            logger.warning(f"MySQL connection failed ({e}). Falling back to SQLite.")
            return None

    def get_sqlite_connection(self):
        conn = sqlite3.connect(config.SQLITE_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        # Try MySQL first
        conn = self.get_mysql_connection()
        if conn and conn.is_connected():
            self.db_type = "mysql"
            logger.info("Successfully connected to Aiven Cloud MySQL!")
            cursor = conn.cursor()
            self._create_mysql_tables(cursor)
            conn.commit()
            cursor.close()
            conn.close()
        else:
            self.db_type = "sqlite"
            logger.info("Using SQLite fallback storage for seamless offline/local execution.")
            s_conn = self.get_sqlite_connection()
            cursor = s_conn.cursor()
            self._create_sqlite_tables(cursor)
            s_conn.commit()
            s_conn.close()

    def _create_mysql_tables(self, cursor):
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS citizens (
            agent_id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            age INT,
            gender VARCHAR(20),
            occupation VARCHAR(100),
            education VARCHAR(50),
            monthly_income DOUBLE,
            savings DOUBLE,
            debt DOUBLE,
            essential_expense DOUBLE,
            discretionary_expense DOUBLE,
            goal VARCHAR(255),
            risk_score DOUBLE,
            is_distressed INT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS simulation_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tick INT NOT NULL,
            run_id VARCHAR(64),
            food_shock_pct DOUBLE,
            tax_rate DOUBLE,
            inflation_rate DOUBLE,
            gini_coefficient DOUBLE,
            poverty_rate DOUBLE,
            avg_savings DOUBLE,
            avg_income DOUBLE,
            distressed_count INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS economic_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_type VARCHAR(100) NOT NULL,
            description TEXT,
            magnitude DOUBLE,
            tick INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

    def _create_sqlite_tables(self, cursor):
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS citizens (
            agent_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            age INTEGER,
            gender TEXT,
            occupation TEXT,
            education TEXT,
            monthly_income REAL,
            savings REAL,
            debt REAL,
            essential_expense REAL,
            discretionary_expense REAL,
            goal TEXT,
            risk_score REAL,
            is_distressed INTEGER,
            updated_at TEXT
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS simulation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tick INTEGER NOT NULL,
            run_id TEXT,
            food_shock_pct REAL,
            tax_rate REAL,
            inflation_rate REAL,
            gini_coefficient REAL,
            poverty_rate REAL,
            avg_savings REAL,
            avg_income REAL,
            distressed_count INTEGER,
            created_at TEXT
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS economic_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            description TEXT,
            magnitude REAL,
            tick INTEGER,
            created_at TEXT
        );
        """)

    def get_status(self) -> Dict[str, Any]:
        # Test if MySQL can be reached currently
        mysql_live = False
        try:
            m_conn = self.get_mysql_connection()
            if m_conn and m_conn.is_connected():
                mysql_live = True
                m_conn.close()
        except Exception:
            mysql_live = False

        return {
            "active_storage": self.db_type,
            "mysql_host": config.MYSQL_HOST,
            "mysql_port": config.MYSQL_PORT,
            "mysql_database": config.MYSQL_DATABASE,
            "mysql_user": config.MYSQL_USER,
            "mysql_connected": mysql_live,
            "mysql_error": self.mysql_error if not mysql_live else None,
            "sqlite_file": config.SQLITE_PATH
        }

    def save_citizens(self, citizens: List[Dict[str, Any]]):
        now = datetime.now().isoformat()
        if self.db_type == "mysql":
            conn = self.get_mysql_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    query = """
                    REPLACE INTO citizens 
                    (agent_id, name, age, gender, occupation, education, monthly_income, savings, debt,
                     essential_expense, discretionary_expense, goal, risk_score, is_distressed)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    data = [
                        (c["id"], c["name"], c.get("age", 30), c.get("gender", "Other"),
                         c["occupation"], c.get("education", "Secondary"),
                         float(c["income"]), float(c["savings"]), float(c.get("debt", 0)),
                         float(c.get("essential_expenses", 0)), float(c.get("discretionary_expenses", 0)),
                         c.get("goal", ""), float(c.get("risk_score", 0.0)), int(c.get("is_distressed", 0)))
                        for c in citizens
                    ]
                    cursor.executemany(query, data)
                    conn.commit()
                    cursor.close()
                    conn.close()
                    return True
                except Exception as e:
                    logger.error(f"MySQL save_citizens error: {e}")

        # Fallback to SQLite
        try:
            s_conn = self.get_sqlite_connection()
            cursor = s_conn.cursor()
            query = """
            INSERT OR REPLACE INTO citizens 
            (agent_id, name, age, gender, occupation, education, monthly_income, savings, debt,
             essential_expense, discretionary_expense, goal, risk_score, is_distressed, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            data = [
                (c["id"], c["name"], c.get("age", 30), c.get("gender", "Other"),
                 c["occupation"], c.get("education", "Secondary"),
                 float(c["income"]), float(c["savings"]), float(c.get("debt", 0)),
                 float(c.get("essential_expenses", 0)), float(c.get("discretionary_expenses", 0)),
                 c.get("goal", ""), float(c.get("risk_score", 0.0)), int(c.get("is_distressed", 0)), now)
                for c in citizens
            ]
            cursor.executemany(query, data)
            s_conn.commit()
            s_conn.close()
            return True
        except Exception as e:
            logger.error(f"SQLite save_citizens error: {e}")
            return False

    def record_tick_metrics(self, tick_data: Dict[str, Any]):
        now = datetime.now().isoformat()
        if self.db_type == "mysql":
            conn = self.get_mysql_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    cursor.execute("""
                    INSERT INTO simulation_history 
                    (tick, run_id, food_shock_pct, tax_rate, inflation_rate, gini_coefficient, 
                     poverty_rate, avg_savings, avg_income, distressed_count)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        tick_data["tick"], tick_data.get("run_id", "default"),
                        tick_data.get("food_shock_pct", 0), tick_data.get("tax_rate", 0.1),
                        tick_data.get("inflation_rate", 0.05), tick_data.get("gini_coefficient", 0.35),
                        tick_data.get("poverty_rate", 0.15), tick_data.get("avg_savings", 20000),
                        tick_data.get("avg_income", 35000), tick_data.get("distressed_count", 0)
                    ))
                    conn.commit()
                    cursor.close()
                    conn.close()
                    return
                except Exception as e:
                    logger.error(f"MySQL record_tick error: {e}")

        # Fallback to SQLite
        try:
            s_conn = self.get_sqlite_connection()
            cursor = s_conn.cursor()
            cursor.execute("""
            INSERT INTO simulation_history 
            (tick, run_id, food_shock_pct, tax_rate, inflation_rate, gini_coefficient, 
             poverty_rate, avg_savings, avg_income, distressed_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tick_data["tick"], tick_data.get("run_id", "default"),
                tick_data.get("food_shock_pct", 0), tick_data.get("tax_rate", 0.1),
                tick_data.get("inflation_rate", 0.05), tick_data.get("gini_coefficient", 0.35),
                tick_data.get("poverty_rate", 0.15), tick_data.get("avg_savings", 20000),
                tick_data.get("avg_income", 35000), tick_data.get("distressed_count", 0), now
            ))
            s_conn.commit()
            s_conn.close()
        except Exception as e:
            logger.error(f"SQLite record_tick error: {e}")

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            s_conn = self.get_sqlite_connection()
            cursor = s_conn.cursor()
            cursor.execute("""
            SELECT * FROM simulation_history ORDER BY id DESC LIMIT ?
            """, (limit,))
            rows = [dict(row) for row in cursor.fetchall()]
            s_conn.close()
            return list(reversed(rows))
        except Exception as e:
            logger.error(f"Error fetching history: {e}")
            return []

db_manager = DatabaseManager()
