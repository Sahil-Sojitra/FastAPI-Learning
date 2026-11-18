# FastAPI Task Board API

A modular, lightweight, production-grade RESTful API for managing user-owned tasks, built using **FastAPI**, **SQLAlchemy 2.0**, **Pydantic v2**, **Alembic**, and **Uvicorn**.

---

## Features

- **Request ID Tracking**: Every HTTP request receives an immutable, server-generated UUID4 stored in `request.state.request_id` and returned in the `X-Request-ID` response header.
- **Structured JSON Request Logging**: Single-line JSON request-summary logging using Python's standard `logging` library, capturing timestamps, method, matched route template, status code, and duration.
- **Safe Centralized Error Handling**: Unexpected failures are converted into safe `500 Internal Server Error` JSON responses containing the correlating `request_id`, while logging sanitized stack locations without leaking query strings, parameters, or secret credentials.
- **JWT Authentication & Registration**: Secure user registration, password hashing via Argon2 (`pwdlib`), and signed JWT bearer tokens (`pyjwt`).
- **User Ownership & Isolation**: Strict multi-tenant isolation where tasks belong to the authenticated owner. Users cannot access, view, modify, or delete another user's tasks.
- **Full Task CRUD**: Create, read, update status, and delete tasks.
- **Filtering & Pagination**: Paginated list retrieval (`limit`, `offset`) and status filtering (`TODO`, `IN_PROGRESS`, `DONE`) scoped to the requesting user before pagination.
- **Transactional Database Architecture**: Synchronous SQLAlchemy 2.0 supporting both PostgreSQL (via modern Psycopg 3 driver `psycopg[binary]`) and SQLite, with automatic connection pinging (`pool_pre_ping=True`), session rollbacks on failure, and SQLite foreign key pragma enforcement.
- **Typed Configuration**: Validated `Settings` management using `pydantic-settings` with secret masking and `.env` file discovery anchored to the project root.
- **CORS Middleware**: Explicit CORS policy for modern web and mobile clients without wildcards.
- **Learning & Historical Scripts**: Archived learning scripts moved to `scripts/learning/` documenting schema creation and rollback behaviors.

---

## Project Structure & Responsibilities

The application is structured into feature-based packages and centralized core/db infrastructure:

```text
fastapi-task-board/
├── app/
│   ├── __init__.py                  # App package initialization
│   ├── main.py                      # Application factory, middleware, CORS, and router mounting
│   ├── core/                        # Global configuration, security, and observability utilities
│   │   ├── __init__.py
│   │   ├── config.py                # Pydantic Settings class, .env loading, and project constants
│   │   ├── exception_handlers.py    # Centralized 500 handler and sanitized stack trace extractor
│   │   ├── logging.py               # JSON formatter and idempotent logger setup
│   │   ├── middleware.py            # Request ID, process timing, and structured request logging middleware
│   │   └── security.py              # Password hashing (Argon2) and JWT token generation
│   ├── db/                          # Database connection and metadata registry
│   │   ├── __init__.py
│   │   ├── base.py                  # Single authoritative DeclarativeBase
│   │   ├── session.py               # Engine creation, SQLite event listeners, and get_db session generator
│   │   └── model_registry.py        # Centralized import of all models for Alembic and test runners
│   └── features/                    # Feature modules containing routers, schemas, services, models
│       ├── __init__.py
│       ├── auth/                    # User authentication & identity feature
│       │   ├── __init__.py
│       │   ├── dependencies.py      # HTTPBearer credential extraction and get_current_user dependency
│       │   ├── exceptions.py        # Domain exceptions (EmailAlreadyRegisteredError, InvalidCredentialsError)
│       │   ├── models.py            # User SQLAlchemy table model
│       │   ├── router.py            # Endpoints: POST /auth/register, POST /auth/login, GET /auth/me
│       │   ├── schemas.py           # Pydantic models (UserRegister, UserLogin, UserRead, TokenRead)
│       │   └── service.py           # Business logic: user registration and authentication
│       ├── tasks/                   # Task board feature
│       │   ├── __init__.py
│       │   ├── exceptions.py        # Domain exceptions (TaskNotFoundError)
│       │   ├── models.py            # Task SQLAlchemy table model (with owner_id foreign key)
│       │   ├── router.py            # Endpoints: GET, POST, PATCH, DELETE /tasks
│       │   ├── schemas.py           # Pydantic models (TaskCreate, TaskStatusUpdate, TaskRead)
│       │   └── service.py           # Business logic: user-scoped task querying, creation, status update, deletion
│       └── health/                  # Health check & system diagnostics
│           ├── __init__.py
│           └── router.py            # Endpoints: GET /health, GET /health/db
├── migrations/                      # Alembic schema migrations and environment configuration
├── scripts/
│   ├── __init__.py
│   └── learning/                    # Preserved learning and verification scripts
│       ├── __init__.py
│       ├── check_rollback.py        # Validates rollback handling on SQLite integrity error
│       ├── init_db.py               # Historical schema initialization (superseded by Alembic)
│       └── save_task.py             # Validates basic task persistence
├── tests/                           # Isolated pytest test suite
├── .env.example                     # Environment template with secret placeholders
├── pytest.ini                       # Test runner configuration (pythonpath = .)
├── requirements.txt                 # Pinned project dependencies
└── run.py                           # Smart development launcher (venv auto-activation, zombie port cleanup)
```

### Module Responsibilities

- **`app/main.py`**: Initializes the FastAPI app (`debug=False`), attaches `CORSMiddleware`, registers `RequestLoggingMiddleware`, attaches the centralized 500 error handler, and mounts routers.
- **`app/core/logging.py`**: Configures Python's standard `logging` with `JsonFormatter` to format log records into structured JSON lines. Prevents duplicate handlers.
- **`app/core/middleware.py`**: Manages the request lifecycle: assigns server-side `request_id`, tracks total execution duration (`X-Process-Time-Ms`), identifies the matched route template (or `unmatched_route`), and emits exactly one request summary log event.
- **`app/core/exception_handlers.py`**: Catches unhandled exceptions, logs an error event with sanitized stack frames, and returns a safe HTTP 500 JSON response.
- **`app/core/config.py`**: Loads `.env` via an absolute path anchored to the project root, parses environment variables, masks secrets in validation errors, and exposes a strongly typed `settings` object.
- **`app/core/security.py`**: Handles password hashing (`argon2`), verification, and access token JWT encoding.
- **`app/db/base.py`**: Defines the single shared `Base = DeclarativeBase()` instance.
- **`app/db/session.py`**: Owns database `engine`, foreign key PRAGMA event listener, and `get_db` FastAPI dependency.
- **`app/db/model_registry.py`**: Imports both `User` and `Task` so all model table definitions are attached to `Base.metadata` for Alembic migrations and test engines.
- **`app/features/*/router.py`**: Defines HTTP routing, status codes, query parameters, dependency injection, and exception translation (`HTTPException`).
- **`app/features/*/service.py`**: Encapsulates database transactions, queries, business logic, and raises domain exceptions.
- **`app/features/*/schemas.py`**: Defines Pydantic validation schemas for request bodies and response serialization.
- **`app/features/*/models.py`**: Defines database table mappings inheriting from `app.db.base.Base`.
- **`app/features/*/exceptions.py`**: Defines custom domain exceptions decoupled from HTTP concepts.

---

## Observability & Error Handling

### 1. Request IDs

Every HTTP request is assigned a unique UUID4 by `RequestLoggingMiddleware`.
- **Server Authority**: Request IDs are generated strictly server-side. Incoming client `X-Request-ID` headers are ignored to prevent request spoofing or ID collisions.
- **State Storage**: The ID is stored in `request.state.request_id` for access by dependencies, service routines, and exception handlers.
- **Header Propagation**: The ID is returned in the `X-Request-ID` HTTP response header for all responses: successful 2xx responses, handled 4xx errors, and unhandled 500 errors.

### 2. Structured Request Logging (JSON)

Every request emits **one single request-summary log event** in JSON format via standard Python logging (`logger.info`).

#### Example Safe Request-Summary Log
```json
{
  "timestamp": "2026-11-18T07:24:39.396749+00:00",
  "level": "INFO",
  "request_id": "7907285e-485c-415c-8f97-3e80417fe8ba",
  "method": "GET",
  "route": "/tasks/{task_id}",
  "status": 200,
  "status_code": 200,
  "duration_ms": 1.45
}
```

#### How to Correlate a Response to Logs
When a client observes an issue or receives an error:
1. Copy the `X-Request-ID` response header (e.g., `7907285e-485c-415c-8f97-3e80417fe8ba`) or the `request_id` field from a 500 error body.
2. Search the JSON log stream for `"request_id": "7907285e-485c-415c-8f97-3e80417fe8ba"`.
3. Locate both the request summary and any accompanying `unexpected_error` log entries sharing that ID.

#### Duration Measurement (`X-Process-Time-Ms`)
`X-Process-Time-Ms` measures the total elapsed server-side wall-clock processing time (in milliseconds) from when the request enters `RequestLoggingMiddleware` to when the response headers and body are ready for dispatch.

#### Deliberately Excluded Information (Privacy & Security)
To comply with security and data-protection standards, the application **never** logs:
- Raw URL paths containing potential IDs or sensitive identifiers.
- Query parameter strings or parsed query dicts.
- Request headers (preventing leakage of `Authorization: Bearer <token>` or cookies).
- Request bodies (preventing storage of plaintext passwords or personal information).
- SQL statements with raw parameters or traceback local variables.

### 3. Expected vs. Unexpected Errors

#### Expected Errors (Handled Client & Domain Errors)
- Examples: 401 Unauthorized (expired/missing token), 404 Not Found (missing task), 409 Conflict (duplicate email), 422 Unprocessable Entity (schema validation failure).
- **Behavior**: Preserves exact HTTP status codes, original response shapes, and headers (e.g. `WWW-Authenticate: Bearer`). Receives standard `X-Request-ID` and `X-Process-Time-Ms` headers. Emits an `INFO` request summary.

#### Unexpected Errors (Unhandled Server Exceptions)
- Examples: Uncaught `RuntimeError`, unexpected database driver crash, unhandled exceptions in third-party libraries.
- **Behavior**: Handled centrally by `app/core/exception_handlers.py`.
- **Response**: Returns HTTP 500 with a sanitized payload:
  ```json
  {
    "detail": "Internal server error",
    "request_id": "54a0ad61-ddf8-496e-967c-1902545c3c38"
  }
  ```
- **Error Event**: Logs an `ERROR` event containing only:
  - `event`: `"unexpected_error"`
  - `request_id`: matching request UUID
  - `exception_class`: e.g. `"RuntimeError"`
  - `stack`: Sanitized list of frames containing only `{"file": ..., "line": ..., "function": ...}` without raw code strings, arguments, or local variables.

### 4. Known Limitations

- **Streaming Responses**: If an error occurs after a streaming response has started sending bytes over the wire, HTTP headers and status codes can no longer be modified. In such cases, the exception propagates to ASGI connection tear-down without attempting to replace the partial response.
- **Background Tasks**: Tasks scheduled via `BackgroundTasks` run *after* the HTTP response has completed and been dispatched. Any exceptions occurring within a detached background task cannot alter the client's HTTP response status or headers, but will be captured by global task exception handlers.

---

## Commands

### 1. Run Development Server

Using the smart launcher (automatically manages `.venv` and frees port 8000 if orphaned):
```powershell
python run.py
```

Or run directly with Uvicorn:
```powershell
python -m uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### 2. Database Setup & Migrations (SQLite & PostgreSQL / Neon)

The application seamlessly supports both local SQLite and PostgreSQL (such as Neon, Supabase, or AWS RDS):

- **Driver**: Modern synchronous Psycopg 3 (`psycopg[binary]>=3.1.18`).
- **Automatic Normalization**: Any standard connection string starting with `postgresql://` or `postgres://` is automatically normalized to `postgresql+psycopg://` without leaking credentials or query parameters.
- **SSL & Connection Options**: Preserves Neon's SSL and channel-binding query options (e.g., `?sslmode=require&channel_binding=require`).
- **Database Selection**: Configured via `DATABASE_URL` in `.env` (or OS environment variables). Falls back to the anchored project SQLite file (`task_board.db`) if unspecified.

#### Inspect migration consistency against models:
```powershell
python -m alembic check
```

#### Apply latest migrations to the active database:
```powershell
python -m alembic upgrade head
```

#### Inspect current migration version:
```powershell
python -m alembic current
```

### 3. Run Automated Tests

Execute the complete isolated test suite:
```powershell
python -m pytest -v
```

---

## Detailed Request Flow

### 1. `POST /auth/login`
```
Client Request -> [app/main.py] (Timing & CORS Middleware)
                -> [app/features/auth/router.py:login]
                -> [app/db/session.py:get_db] yields Session
                -> [app/features/auth/service.py:authenticate_user]
                   - Normalizes email to lowercase
                   - Queries User by email
                   - Verifies password hash via [app/core/security.py:verify_password]
                   - Raises InvalidCredentialsError on mismatch
                -> [app/core/security.py:create_access_token] signs JWT with sub=user.id, exp, iat
                -> Returns TokenRead(access_token="...", token_type="bearer") with status 200
```

### 2. `GET /auth/me`
```
Client Request -> [app/main.py] (Timing & CORS Middleware)
                -> [app/features/auth/router.py:get_me]
                -> Depends([app/features/auth/dependencies.py:get_current_user])
                   - Extracts token from "Authorization: Bearer <token>"
                   - Decodes and validates JWT using settings.JWT_SECRET and settings.JWT_ALGORITHM
                   - Parses user_id from sub claim
                   - Queries db.get(User, user_id)
                   - Raises HTTPException(401) if invalid, expired, or user not found
                -> Passes authenticated User model to route handler
                -> Serializes via UserRead schema (status 200)
```

### 3. `POST /tasks`
```
Client Request -> [app/main.py] (Timing & CORS Middleware)
                -> [app/features/tasks/router.py:create_task]
                -> Validates body against TaskCreate(title=...)
                -> Depends([app/features/auth/dependencies.py:get_current_user]) returns User
                -> Depends([app/db/session.py:get_db]) yields Session
                -> [app/features/tasks/service.py:create_task]
                   - Instantiates Task(title=..., status="TODO", owner_id=user.id, created_at=utc_now)
                   - db.add(task) and _commit(db)
                   - db.refresh(task)
                -> Serializes via TaskRead schema (status 201)
```

### 4. `PATCH /tasks/{task_id}`
```
Client Request -> [app/main.py] (Timing & CORS Middleware)
                -> [app/features/tasks/router.py:update_task_status]
                -> Depends([app/features/tasks/router.py:get_existing_task])
                   - Authenticates user via get_current_user
                   - Calls [app/features/tasks/service.py:find_task(db, task_id, owner_id=user.id)]
                   - If task does not exist or owner_id does not match: raises TaskNotFoundError
                   - Translates TaskNotFoundError -> HTTPException(status_code=404, detail="Task not found")
                -> Validates body against TaskStatusUpdate(status=...)
                -> [app/features/tasks/service.py:update_task_status]
                   - task.status = update.status
                   - _commit(db) and db.refresh(task)
                -> Serializes via TaskRead schema (status 200)
```

---

## Authentication vs. Ownership

- **Authentication (`Who are you?`)**:
  - Handled by `app/features/auth/dependencies.py:get_current_user`.
  - Validates cryptographic signature and expiration of the JWT bearer token.
  - Verifies that the user exists in the `users` table.
  - If authentication fails, the request is immediately rejected with `401 Unauthorized`.
- **Ownership (`What are you allowed to access?`)**:
  - Handled by `app/features/tasks/service.py` and `app/features/tasks/router.py`.
  - Once the user is authenticated, every task operation is strictly scoped to `owner_id == user.id`.
  - Creating a task automatically assigns `owner_id = user.id`. Clients cannot specify or override `owner_id`.
  - Listing tasks filters by `Task.owner_id == user.id` before applying `limit` and `offset`.
  - Retrieving, updating, or deleting a specific task requires matching both `id == task_id` and `owner_id == user.id`.
  - If a task exists in the database but belongs to a different user, the system returns `404 Not Found` (never `403 Forbidden`) to avoid leaking the existence of other users' tasks.

---

## Architecture for Future Features (Ingestion & Streaming)

Under this feature-based architecture, any future capability integrates cleanly as an independent feature package under `app/features/` without coupling to existing features:

### 1. Example: Ingestion Feature (`app/features/ingestion/`)
- `app/features/ingestion/router.py`: Exposes endpoints for file uploads, CSV imports, or webhook payloads (e.g. `POST /ingestion/tasks/csv`).
- `app/features/ingestion/schemas.py`: Defines batch upload schemas and validation models.
- `app/features/ingestion/service.py`: Contains parsing logic, batch validation, and invokes `app.features.tasks.service:create_task` or bulk insertions.
- `app/features/ingestion/models.py`: (Optional) Tables tracking batch ingestion job status, logs, or history.

### 2. Example: Streaming / Real-time Feature (`app/features/streaming/`)
- `app/features/streaming/router.py`: WebSocket or Server-Sent Events (SSE) endpoints (e.g. `GET /streaming/tasks/events`).
- `app/features/streaming/service.py`: Manages active connections, pub/sub channels, or event queues dispatching task update notifications.

---

## API Endpoints Overview

### Auth (`/auth`)
| Method | Endpoint | Status Code | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | `201 Created` | Register a new user | No |
| `POST` | `/auth/login` | `200 OK` | Authenticate and obtain JWT token | No |
| `GET` | `/auth/me` | `200 OK` | Get current authenticated user profile | Yes (Bearer) |

### Tasks (`/tasks`)
| Method | Endpoint | Status Code | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | `200 OK` | List tasks owned by the caller (`?status=`, `?limit=`, `?offset=`) | Yes (Bearer) |
| `GET` | `/tasks/{task_id}` | `200 OK` | Get task by ID (caller must be owner) | Yes (Bearer) |
| `POST` | `/tasks` | `201 Created` | Create task (assigned to caller) | Yes (Bearer) |
| `PATCH` | `/tasks/{task_id}` | `200 OK` | Update task status (`TODO`, `IN_PROGRESS`, `DONE`) | Yes (Bearer) |
| `DELETE` | `/tasks/{task_id}` | `204 No Content`| Delete task (caller must be owner) | Yes (Bearer) |

### System & Health (`/health`)
| Method | Endpoint | Status Code | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | `200 OK` | Service uptime check | No |
| `GET` | `/health/db` | `200 OK` | Database connectivity check (`SELECT 1`) | No |
