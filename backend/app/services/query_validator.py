"""SQL query validation service using sqlglot."""

import sqlglot
from sqlglot import exp


def validateAndPrepare(sql: str, dialect: str) -> tuple[str, bool]:
    """Validate and prepare a SQL query for execution.

    Args:
        sql: The SQL query string.
        dialect: The SQL dialect (e.g., 'mysql', 'postgresql').

    Returns:
        Tuple of (prepared SQL string, whether LIMIT was auto-applied).

    Raises:
        ValueError: If SQL is invalid or contains disallowed statements.
    """
    # Parse the SQL with the specified dialect
    try:
        parsed = sqlglot.parse(sql, dialect=dialect)
    except sqlglot.errors.ParseError as e:
        raise ValueError(f"SQL syntax error: {e}") from e

    if not parsed or len(parsed) == 0:
        raise ValueError("Empty or invalid SQL query")

    # Reject multi-statement queries
    if len(parsed) > 1:
        raise ValueError("Multi-statement queries are not allowed")

    statement = parsed[0]

    # Reject non-SELECT statements
    if not isinstance(statement, exp.Select):
        stmtType = type(statement).__name__
        raise ValueError(
            f"Only SELECT statements are allowed. Got: {stmtType}"
        )

    # Check for LIMIT clause
    hasLimit = statement.find(exp.Limit) is not None
    limitApplied = False

    # If no LIMIT, add LIMIT 1000
    if not hasLimit:
        # Modify the SQL to add LIMIT
        modifiedSql = f"{sql.rstrip(';')} LIMIT 1000"
        limitApplied = True
    else:
        modifiedSql = sql

    return modifiedSql, limitApplied
