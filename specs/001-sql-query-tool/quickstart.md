# Quickstart: SQL Query Tool

## Prerequisites

- Python 3.13+
- Node.js 18+
- uv (Python package manager)
- A MySQL database to connect to
- OpenAI API key

## Setup

### 1. Clone and install backend

```bash
cd backend
uv sync
```

### 2. Configure environment

```bash
export OPENAI_API_KEY="your-openai-api-key"
# Optional: set encryption key (auto-generated if not set)
export DB_QUERY_SECRET_KEY="your-secret-key"
```

### 3. Install frontend

```bash
cd frontend
npm install
```

### 4. Start the backend

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

### 6. Open the application

Navigate to `http://localhost:5173` in your browser.

## First Use

1. Click "Add Connection" and enter your MySQL database URL
   (e.g., `mysql://user:pass@localhost:3306/mydb`).
2. Wait for metadata extraction to complete. You will see a list of
   tables and views.
3. Click on any table to view its columns and details.
4. Navigate to the Query tab:
   - Type SQL directly in the Monaco editor and click "Run".
   - Or switch to "Natural Language" mode, describe your query in
     plain text, review the generated SQL, and execute.
5. Results appear as a formatted table below the editor.

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── models/              # Pydantic models
│   ├── services/            # Business logic
│   ├── api/                 # Route handlers
│   └── db/                  # SQLite database management
└── tests/

frontend/
├── src/
│   ├── App.tsx              # Refine app root
│   ├── components/          # Reusable components
│   ├── pages/               # Page components
│   └── providers/           # Refine data providers
└── tests/
```

## Key Commands

| Command | Description |
|---------|-------------|
| `uv run uvicorn app.main:app --reload` | Start backend (dev) |
| `npm run dev` | Start frontend (dev) |
| `uv run pytest` | Run backend tests |
| `npm run build` | Build frontend for production |
