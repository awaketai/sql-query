"""Database driver registry.

This module provides a registry for database drivers, allowing
dynamic registration and retrieval of drivers by database type.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.database_driver import DatabaseDriver

# Module-level registry mapping dbType to driver class
_driverRegistry: dict[str, type[DatabaseDriver]] = {}


def registerDriver(dbType: str, driverClass: type[DatabaseDriver]) -> None:
    """Register a database driver for a specific database type.

    Args:
        dbType: The database type identifier (e.g., 'mysql', 'postgresql').
        driverClass: The driver class implementing DatabaseDriver protocol.

    Raises:
        ValueError: If dbType is empty or driverClass is None.
    """
    if not dbType:
        raise ValueError("dbType cannot be empty")
    if driverClass is None:
        raise ValueError("driverClass cannot be None")

    _driverRegistry[dbType.lower()] = driverClass


def getDriver(dbType: str) -> DatabaseDriver:
    """Get a driver instance for the specified database type.

    Args:
        dbType: The database type identifier.

    Returns:
        An instance of the registered driver.

    Raises:
        ValueError: If no driver is registered for the given dbType.
    """
    normalizedType = dbType.lower()
    if normalizedType not in _driverRegistry:
        available = ", ".join(sorted(_driverRegistry.keys()))
        raise ValueError(
            f"Unsupported database type: '{dbType}'. "
            f"Available types: {available or 'none'}"
        )

    driverClass = _driverRegistry[normalizedType]
    return driverClass()


# Auto-register built-in drivers on import
def _autoRegisterDrivers() -> None:
    """Auto-register all built-in database drivers."""
    # Import and register MySQL driver
    try:
        from app.services.drivers.mysql_driver import MySqlDriver

        registerDriver("mysql", MySqlDriver)
    except ImportError:
        # MySQL driver not available (missing dependencies)
        pass

    # Import and register PostgreSQL driver
    try:
        from app.services.drivers.postgres_driver import PostgresDriver

        registerDriver("postgresql", PostgresDriver)
    except ImportError:
        # PostgreSQL driver not available (missing dependencies)
        pass


# Run auto-registration when module is imported
_autoRegisterDrivers()
