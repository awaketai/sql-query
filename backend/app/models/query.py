"""Query-related Pydantic models."""

from pydantic import BaseModel, Field

from app.models.common import QuerySource, QueryStatus


class QueryRequest(BaseModel):
    """Request to execute a SQL query."""

    sql: str = Field(..., description="SQL query to execute")
    source: QuerySource = Field(
        default=QuerySource.MANUAL, description="Query source type"
    )


class QueryResponse(BaseModel):
    """Response from query execution."""

    columns: list[str] = Field(..., description="Column names")
    rows: list[dict[str, object]] = Field(..., description="Query result rows")
    rowCount: int = Field(..., description="Number of rows returned")
    limitApplied: bool = Field(
        ..., description="Whether LIMIT 1000 was auto-applied"
    )
    executionTimeMs: int = Field(..., description="Execution time in milliseconds")


class QueryHistoryItem(BaseModel):
    """Query history record."""

    id: int
    sqlText: str = Field(..., description="The executed SQL statement")
    source: QuerySource = Field(..., description="Query source type")
    naturalLanguageInput: str | None = Field(
        None, description="Original natural language input (if LLM generated)"
    )
    status: QueryStatus = Field(..., description="Execution status")
    rowCount: int | None = Field(None, description="Number of rows returned")
    errorMessage: str | None = Field(None, description="Error details if failed")
    executedAt: str = Field(..., description="Execution timestamp")
    durationMs: int | None = Field(None, description="Execution time in ms")
