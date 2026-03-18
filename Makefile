.PHONY: help install dev start stop restart clean test lint

# Default target
help:
	@echo "DB Query Tool - Available Commands:"
	@echo ""
	@echo "  make install      Install all dependencies (backend + frontend)"
	@echo "  make dev          Start both backend and frontend in development mode"
	@echo "  make start        Start both services in background"
	@echo "  make stop         Stop all running services"
	@echo "  make restart      Restart all services"
	@echo "  make clean        Clean build artifacts and caches"
	@echo "  make test         Run all tests"
	@echo "  make lint         Run linting checks"
	@echo ""
	@echo "  make backend      Start only the backend server"
	@echo "  make frontend     Start only the frontend dev server"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Python 3.13+ with uv"
	@echo "  - Node.js 18+"
	@echo "  - OpenAI API key (export OPENAI_API_KEY=your-key)"
	@echo ""

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && uv sync
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✓ Installation complete"

# Development mode (foreground)
dev:
	@echo "Starting development servers..."
	@trap 'kill 0' INT; \
	(cd backend && uv run uvicorn app.main:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

# Start services in background
start:
	@echo "Starting backend server..."
	cd backend && uv run uvicorn app.main:app --port 8000 > ../logs/backend.log 2>&1 &
	@echo $$! > .backend.pid
	@sleep 2
	@echo "Starting frontend server..."
	cd frontend && npm run dev > ../logs/frontend.log 2>&1 &
	@echo $$! > .frontend.pid
	@echo "✓ Services started"
	@echo "  Backend:  http://localhost:8000"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Logs:     ./logs/"

# Stop all services
stop:
	@echo "Stopping services..."
	@if [ -f .backend.pid ]; then \
		kill $$(cat .backend.pid) 2>/dev/null || true; \
		rm -f .backend.pid; \
	fi
	@if [ -f .frontend.pid ]; then \
		kill $$(cat .frontend.pid) 2>/dev/null || true; \
		rm -f .frontend.pid; \
	fi
	@pkill -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -f "vite" 2>/dev/null || true
	@echo "✓ Services stopped"

# Restart services
restart: stop start

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/.venv
	rm -rf backend/__pycache__
	rm -rf backend/.pytest_cache
	rm -rf backend/.ruff_cache
	rm -rf backend/dist
	rm -rf backend/*.egg-info
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	rm -rf frontend/.vite
	rm -rf db_query
	rm -rf logs
	rm -f .backend.pid .frontend.pid
	@echo "✓ Clean complete"

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && uv run pytest -v
	@echo "Running frontend tests..."
	cd frontend && npm test -- --run

# Run linting
lint:
	@echo "Linting backend..."
	cd backend && uv run ruff check .
	@echo "Linting frontend..."
	cd frontend && npm run lint

# Start only backend
backend:
	@echo "Starting backend server..."
	cd backend && uv run uvicorn app.main:app --reload --port 8000

# Start only frontend
frontend:
	@echo "Starting frontend dev server..."
	cd frontend && npm run dev

# Create logs directory
logs:
	mkdir -p logs
