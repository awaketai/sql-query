<!--
Sync Impact Report
===================
- Version change: N/A → 1.0.0 (initial creation)
- Added principles:
  1. Ergonomic Python + TypeScript Stack
  2. Strict Type Safety
  3. Pydantic Data Models
  4. camelCase Naming Convention
- Added sections:
  - Technology Standards
  - Code Quality Gates
  - Governance
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no updates needed (generic)
  - .specify/templates/spec-template.md ✅ no updates needed (generic)
  - .specify/templates/tasks-template.md ✅ no updates needed (generic)
- Follow-up TODOs: none
-->

# SQL Query Constitution

## Core Principles

### I. Ergonomic Python + TypeScript Stack

Backend code MUST be written in Python using an ergonomic style that
prioritizes readability, expressiveness, and developer comfort. This
includes leveraging modern Python features (3.13+), context managers,
generators, comprehensions, and clean API surfaces.

Frontend code MUST be written in TypeScript. Plain JavaScript is NOT
permitted for any frontend source files.

**Rationale**: Consistency across the stack reduces cognitive load and
ensures every contributor works within well-defined language boundaries.

### II. Strict Type Safety

All backend Python code MUST use type annotations on every function
signature, variable declaration where the type is not immediately
obvious, and return type. `Any` MUST NOT be used unless explicitly
justified with an inline comment.

All frontend TypeScript code MUST compile with `strict: true` in
`tsconfig.json`. Implicit `any` is forbidden. Union types MUST be
exhaustively handled.

**Rationale**: Strict typing catches errors at development time,
improves IDE support, and serves as living documentation.

### III. Pydantic Data Models

All structured data in the backend MUST be defined as Pydantic models.
This includes API request/response schemas, configuration objects,
database row mappings, and inter-service messages.

Raw dictionaries MUST NOT be used for structured data that crosses
function boundaries. Pydantic's validation, serialization, and schema
generation features MUST be leveraged where applicable.

**Rationale**: Pydantic enforces runtime validation, generates JSON
schemas automatically, and provides a single source of truth for data
shapes.

### IV. camelCase Naming Convention

Classes, fields, and functions MUST use camelCase naming across both
backend and frontend codebases. This applies to:

- Python class names (e.g., `queryResult`, not `QueryResult`)
- Python function/method names (e.g., `runQuery`, not `run_query`)
- Python field/variable names (e.g., `tableName`, not `table_name`)
- TypeScript class, function, field, and variable names
- Pydantic model field names (use `alias_generator` or `Field(alias=)`
  if ORM/DB columns follow a different convention)

**Exception**: Third-party library interfaces that enforce their own
naming (e.g., `__init__`, `__str__`) are exempt. Python dunder methods
and decorators retain standard Python naming.

**Rationale**: A single naming convention across the full stack
eliminates translation friction and ensures consistent serialization
between backend and frontend.

## Technology Standards

- **Backend language**: Python 3.13+
- **Frontend language**: TypeScript (strict mode)
- **Data modeling**: Pydantic v2
- **Package manager (Python)**: uv / pip (per pyproject.toml)
- **Naming convention**: camelCase everywhere (see Principle IV)
- **Type checking**: mypy or pyright for Python; tsc strict for
  TypeScript

## Code Quality Gates

All code contributions MUST satisfy the following before merge:

1. **Type check passes**: Zero type errors from the configured type
   checker (mypy/pyright for Python, tsc for TypeScript).
2. **Pydantic models validated**: Any new structured data type MUST be
   a Pydantic model, not a raw dict or ad-hoc class.
3. **Naming compliance**: No snake_case function, class, or field names
   in application code (third-party interface exceptions documented).
4. **No untyped signatures**: Every function MUST have full type
   annotations including return type.

## Governance

This constitution is the authoritative source for project-wide coding
standards and principles. It supersedes any conflicting guidance found
in other documents.

**Amendment procedure**:
1. Propose changes via pull request modifying this file.
2. Changes MUST include a version bump following semantic versioning:
   - MAJOR: Removing or redefining an existing principle.
   - MINOR: Adding a new principle or materially expanding guidance.
   - PATCH: Clarifications, typo fixes, non-semantic refinements.
3. The Sync Impact Report (HTML comment at top of file) MUST be updated
   to reflect the change.

**Compliance review**: All PRs MUST be checked against the principles
in this constitution. Violations MUST be resolved before merge.

**Version**: 1.0.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-18
