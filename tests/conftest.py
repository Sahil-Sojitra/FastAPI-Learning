import pytest
from fastapi.testclient import TestClient
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import Session

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def client(tmp_path):
    test_engine = create_engine(
        URL.create(
            "sqlite",
            database=str(tmp_path / "test.db"),
        ),
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(test_engine)

    def override_get_db():
        with Session(test_engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        test_engine.dispose()


@pytest.fixture
def authenticated_client(client):
    credentials = {
        "email": "task-owner@example.com",
        "password": "Learning-FastAPI-2026!",
    }

    registered = client.post("/auth/register", json=credentials)
    assert registered.status_code == 201

    login = client.post("/auth/login", json=credentials)
    assert login.status_code == 200

    client.headers["Authorization"] = (
        f"Bearer {login.json()['access_token']}"
    )

    yield client

    client.headers.pop("Authorization", None)
