"""SQLite database connection and schema management."""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import aiosqlite

# Database path
_DB_PATH = Path("./db_query/db_query.db")


def _ensureDbDir() -> None:
    """Ensure database directory exists."""
    dbDir = Path("./db_query")
    dbDir.mkdir(parents=True, exist_ok=True)


async def initDb() -> None:
    """Initialize the SQLite database with schema."""
    _ensureDbDir()

    async with aiosqlite.connect(_DB_PATH) as db:
        # Enable foreign keys
        await db.execute("PRAGMA foreign_keys = ON")

        # Create connections table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                displayName TEXT NOT NULL,
                connectionUrl TEXT NOT NULL,
                dbType TEXT NOT NULL DEFAULT 'mysql',
                status TEXT NOT NULL DEFAULT 'active',
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        """)

        # Create tableMetadata table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS tableMetadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                connectionId INTEGER NOT NULL,
                name TEXT NOT NULL,
                schemaName TEXT NOT NULL,
                type TEXT NOT NULL,
                comment TEXT,
                fetchedAt TEXT NOT NULL,
                FOREIGN KEY (connectionId) REFERENCES connections(id) ON DELETE CASCADE
            )
        """)

        # Create columnMetadata table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS columnMetadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tableId INTEGER NOT NULL,
                name TEXT NOT NULL,
                dataType TEXT NOT NULL,
                nullable INTEGER NOT NULL,
                keyType TEXT NOT NULL DEFAULT 'none',
                defaultValue TEXT,
                ordinalPosition INTEGER NOT NULL,
                comment TEXT,
                FOREIGN KEY (tableId) REFERENCES tableMetadata(id) ON DELETE CASCADE
            )
        """)

        # Create queryHistory table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS queryHistory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                connectionId INTEGER NOT NULL,
                sqlText TEXT NOT NULL,
                source TEXT NOT NULL,
                naturalLanguageInput TEXT,
                status TEXT NOT NULL,
                rowCount INTEGER,
                errorMessage TEXT,
                executedAt TEXT NOT NULL,
                durationMs INTEGER,
                FOREIGN KEY (connectionId) REFERENCES connections(id) ON DELETE CASCADE
            )
        """)

        # Create indexes
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_tableMetadata_connectionId
            ON tableMetadata(connectionId)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_columnMetadata_tableId
            ON columnMetadata(tableId)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_queryHistory_connectionId
            ON queryHistory(connectionId)
        """)

        await db.commit()


@asynccontextmanager
async def getConnection() -> AsyncIterator[aiosqlite.Connection]:
    """Get a database connection with foreign keys enabled.

    Usage:
        async with getConnection() as db:
            cursor = await db.execute("SELECT * FROM table")
    """
    _ensureDbDir()
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row
        yield db
