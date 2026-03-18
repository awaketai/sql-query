"""FastAPI application entry point."""

import os
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import connections, generation, metadata, queries
from app.db.sqlite import initDb
from app.models.common import ErrorType

# Load .env file from project root
envPath = Path(__file__).parent.parent / ".env"
if envPath.exists():
    load_dotenv(envPath)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup: Initialize database
    await initDb()
    # Import drivers to trigger auto-registration
    import app.services.drivers  # noqa: F401
    yield
    # Shutdown: Clean up resources if needed


app = FastAPI(
    title="DB Query API",
    description="SQL Query Tool API for database connections and queries",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValueError)
async def valueErrorHandler(request: Request, exc: ValueError):
    """Handle validation errors (400)."""
    return JSONResponse(
        status_code=400,
        content={
            "detail": str(exc),
            "errorType": ErrorType.VALIDATION_ERROR,
            "context": {},
        },
    )


@app.exception_handler(ConnectionError)
async def connectionErrorHandler(request: Request, exc: ConnectionError):
    """Handle connection errors (422)."""
    return JSONResponse(
        status_code=422,
        content={
            "detail": str(exc),
            "errorType": ErrorType.CONNECTION_ERROR,
            "context": {},
        },
    )


@app.exception_handler(RuntimeError)
async def runtimeErrorHandler(request: Request, exc: RuntimeError):
    """Handle runtime/execution errors (422)."""
    errorStr = str(exc)
    if "LLM" in errorStr or "OpenAI" in errorStr or "API key" in errorStr:
        return JSONResponse(
            status_code=503,
            content={
                "detail": errorStr,
                "errorType": ErrorType.LLM_ERROR,
                "context": {},
            },
        )
    return JSONResponse(
        status_code=422,
        content={
            "detail": errorStr,
            "errorType": ErrorType.EXECUTION_ERROR,
            "context": {},
        },
    )


@app.exception_handler(Exception)
async def genericErrorHandler(request: Request, exc: Exception):
    """Handle unexpected errors (500)."""
    # Log the full traceback for debugging
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "errorType": ErrorType.EXECUTION_ERROR,
            "context": {"error": str(exc)},
        },
    )


# Include API routers
app.include_router(connections.router, prefix="/api")
app.include_router(metadata.router, prefix="/api")
app.include_router(queries.router, prefix="/api")
app.include_router(generation.router, prefix="/api")


@app.get("/health")
async def healthCheck() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
