# FastAPI Task Board API

A modular, lightweight RESTful API for managing tasks, built using **FastAPI**, **Pydantic v2**, and **Uvicorn**.

---

## Features

- **Full CRUD Operations**: Create, read, update status, and delete tasks.
- **Filtering by Query Parameter**: Filter tasks by status (e.g., `?status=TODO`).
- **Data Validation & Schemas**: Strictly typed input validation and response filtering using Pydantic models (`TaskCreate`, `TaskRead`, `TaskStatusUpdate`).
- **Clean Architecture & Separation of Concerns**:
  - **Routes**: Grouped under `APIRouter` with prefix `/tasks` and Swagger tag `Tasks`.
  - **Services**: Reusable business logic and error handling (`task_service.py`).
  - **Dependency Injection**: Centralized task lookup and `404 Not Found` handling via `Depends(get_existing_task)`.
- **Custom HTTP Middleware**: Tracks request processing duration with `time.perf_counter()` and injects an `X-Process-Time-Ms` response header.
- **Async Concurrency Demos**: Includes `/demo/blocking` and `/demo/nonblocking` endpoints demonstrating non-blocking I/O.
- **Interactive Documentation**: Auto-generated Swagger UI and ReDoc OpenAPI documentation.

---

## Project Structure

```text
fastapi-task-board/
├── app/
│   ├── __init__.py         # Marks app as a Python package
│   ├── main.py             # FastAPI app initialization, middleware, demo & health routes
│   ├── schemas.py          # Pydantic data models for request/response validation
│   ├── task_routes.py      # APIRouter defining /tasks endpoints
│   └── task_service.py     # Business logic, lookup helpers, and custom exceptions
├── .gitignore              # Git ignore rules for Python, virtualenvs, and OS files
├── README.md               # Project documentation
└── requirements.txt        # Project dependencies
```

---

## API Endpoints

### Tasks (`/tasks`)

| Method | Endpoint | Status Code | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | `200 OK` | Get all tasks (optional `?status=` query filter) |
| `GET` | `/tasks/{task_id}` | `200 OK` | Get a specific task by its ID |
| `POST` | `/tasks` | `201 Created` | Create a new task |
| `PATCH` | `/tasks/{task_id}` | `200 OK` | Update a task's status (`TODO`, `IN_PROGRESS`, `DONE`) |
| `DELETE` | `/tasks/{task_id}` | `204 No Content` | Delete a task |

### System & Demos

| Method | Endpoint | Status Code | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | `200 OK` | Service health check |
| `GET` | `/demo/blocking` | `200 OK` | Demonstrates thread-blocking sleep (`time.sleep`) |
| `GET` | `/demo/nonblocking` | `200 OK` | Demonstrates non-blocking async sleep (`asyncio.sleep`) |

---

## Getting Started

### 1. Prerequisites
- **Python 3.10+** installed on your system.

### 2. Setup Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Development Server
```bash
python -m uvicorn app.main:app --reload
```

The API will be accessible at `http://127.0.0.1:8000`.

---

## Interactive API Documentation

Once the server is running, visit:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Example Usage

### Create a Task
```bash
curl -X POST "http://127.0.0.1:8000/tasks" \
     -H "Content-Type: application/json" \
     -d '{"title": "Implement database integration"}'
```

### Filter Tasks by Status
```bash
curl "http://127.0.0.1:8000/tasks?status=IN_PROGRESS"
```

### Update Task Status
```bash
curl -X PATCH "http://127.0.0.1:8000/tasks/1" \
     -H "Content-Type: application/json" \
     -d '{"status": "DONE"}'
```
