"""Shared Pydantic enums and error models."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DbType(str, Enum):
    """Supported database types."""

    MYSQL = "mysql"
    # Future support:
    # POSTGRESQL = "postgresql"
    # SQLITE = "sqlite"


class ConnectionStatus(str, Enum):
    """Connection status values."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class TableType(str, Enum):
    """Table or view type."""

    TABLE = "TABLE"
    VIEW = "VIEW"


class KeyType(str, Enum):
    """Column key type."""

    PRIMARY = "primary"
    FOREIGN = "foreign"
    UNIQUE = "unique"
    NONE = "none"


class QuerySource(str, Enum):
    """Query source type."""

    MANUAL = "manual"
    LLM_GENERATED = "llmGenerated"


class QueryStatus(str, Enum):
    """Query execution status."""

    SUCCESS = "success"
    ERROR = "error"


class ErrorType(str, Enum):
    """Error type classification."""

    VALIDATION_ERROR = "validation_error"
    CONNECTION_ERROR = "connection_error"
    PARSE_ERROR = "parse_error"
    EXECUTION_ERROR = "execution_error"
    LLM_ERROR = "llm_error"


class ErrorResponse(BaseModel):
    """Standard error response format."""

    detail: str = Field(..., description="Human-readable error message")
    errorType: ErrorType = Field(..., description="Error type classification")
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional error context",
    )
